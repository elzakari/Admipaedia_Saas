from app.extensions import db
from app.models.educational_system import EducationalSystemTemplate, EducationalSystemConfig, GradeLevel
from sqlalchemy.exc import IntegrityError
import structlog

logger = structlog.get_logger()

class EducationalSystemService:
    @staticmethod
    def _validate_template_config(config):
        if not isinstance(config, dict):
            raise ValueError("Template config must be an object.")
        phases = config.get('phases', [])
        if not isinstance(phases, list) or len(phases) == 0:
            raise ValueError("Template config must include a non-empty phases list.")
        for phase in phases:
            if not isinstance(phase, dict):
                raise ValueError("Each phase must be an object.")
            name = phase.get('name')
            levels = phase.get('levels')
            if not isinstance(name, str) or not name.strip():
                raise ValueError("Each phase must have a name.")
            if not isinstance(levels, list) or len(levels) == 0 or not all(isinstance(x, str) and x.strip() for x in levels):
                raise ValueError("Each phase must have a non-empty levels list.")

    @staticmethod
    def get_all_templates(country_code=None):
        """Fetch all available system templates, optionally filtered by country."""
        query = EducationalSystemTemplate.query.filter_by(is_active=True)
        if country_code:
            query = query.filter_by(country_code=country_code)
        return query.all()

    @staticmethod
    def get_template_by_key(system_key):
        return EducationalSystemTemplate.query.filter_by(system_key=system_key, is_active=True).first()

    @staticmethod
    def get_tenant_config(tenant_id):
        """Get the current configuration for the active tenant."""
        return (
            EducationalSystemConfig.query.filter_by(tenant_id=tenant_id, is_active=True)
            .order_by(EducationalSystemConfig.created_at.desc())
            .first()
        )

    @staticmethod
    def apply_template_to_tenant(template_key, tenant_id):
        """
        Apply a template to the current tenant.
        This involves:
        1. Fetching the template.
        2. Creating a new EducationalSystemConfig.
        3. Creating GradeLevel records based on the template.
        """
        template = EducationalSystemService.get_template_by_key(template_key)
        if not template:
            raise ValueError(f"Template with key '{template_key}' not found.")
        EducationalSystemService._validate_template_config(template.config)

        # Deactivate existing configs
        existing_configs = EducationalSystemConfig.query.filter_by(tenant_id=tenant_id, is_active=True).all()
        for conf in existing_configs:
            conf.is_active = False
        
        # Create new config
        new_config = EducationalSystemConfig(
            tenant_id=tenant_id,
            template_key=template.system_key,
            name=template.name,
            config=template.config
        )
        db.session.add(new_config)
        db.session.flush() # Get ID

        # Create Grade Levels
        phases = template.config.get('phases', [])
        order_index = 1
        previous_level = None

        for phase in phases:
            levels = phase.get('levels', [])
            for level_name in levels:
                is_terminal = (level_name == levels[-1] and phase == phases[-1]) # Last level of last phase? Or last of phase?
                # Usually terminal means end of a cycle. Let's assume last of system for now.
                
                grade = GradeLevel(
                    tenant_id=tenant_id,
                    educational_system_id=new_config.id,
                    name=level_name,
                    order_index=order_index,
                    is_terminal=is_terminal,
                )
                db.session.add(grade)
                db.session.flush()
                if previous_level is not None:
                    previous_level.next_level_id = grade.id
                previous_level = grade
                order_index += 1

        try:
            db.session.commit()
            logger.info("educational_system_applied", template=template.name)
            return new_config
        except IntegrityError as e:
            db.session.rollback()
            logger.error("educational_system_apply_error", error=str(e))
            raise e
