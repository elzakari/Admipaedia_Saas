from app import create_app
from app.extensions import db
from app.models.character_development import (
    CharacterTrait, CharacterActivity, CharacterDomain, 
    ValuesEducationResource, activity_traits
)
from app.models.educational_level import EducationalLevel

def create_default_character_traits():
    """Create default character traits for Ghana's education system"""
    
    # Get educational levels
    kg_level = EducationalLevel.query.filter_by(name="Kindergarten").first()
    primary_level = EducationalLevel.query.filter_by(name="Primary").first()
    jhs_level = EducationalLevel.query.filter_by(name="Junior High School").first()
    shs_level = EducationalLevel.query.filter_by(name="Senior High School").first()
    
    # Character traits for different domains
    traits_data = [
        # Religious Values
        {
            "name": "Reverence",
            "description": "Showing deep respect for God, sacred things, and religious practices",
            "domain": CharacterDomain.RELIGIOUS_VALUES,
            "educational_level_id": kg_level.id if kg_level else None,
            "behavioral_indicators": [
                "Participates respectfully in prayers",
                "Shows reverence during religious activities",
                "Treats religious symbols with respect"
            ],
            "assessment_criteria": {
                "1": "Rarely shows reverence, needs constant reminders",
                "2": "Sometimes shows reverence with guidance",
                "3": "Usually shows appropriate reverence",
                "4": "Consistently demonstrates deep reverence and guides others"
            }
        },
        {
            "name": "Gratitude",
            "description": "Appreciating and acknowledging blessings and kindness from others",
            "domain": CharacterDomain.RELIGIOUS_VALUES,
            "educational_level_id": primary_level.id if primary_level else None,
            "behavioral_indicators": [
                "Says thank you genuinely",
                "Acknowledges help from others",
                "Expresses appreciation for daily blessings"
            ],
            "assessment_criteria": {
                "1": "Rarely expresses gratitude",
                "2": "Sometimes shows gratitude when reminded",
                "3": "Regularly expresses genuine gratitude",
                "4": "Consistently grateful and helps others appreciate blessings"
            }
        },
        
        # Moral Values
        {
            "name": "Honesty",
            "description": "Being truthful in words and actions, avoiding deception",
            "domain": CharacterDomain.MORAL_VALUES,
            "educational_level_id": kg_level.id if kg_level else None,
            "behavioral_indicators": [
                "Tells the truth even when difficult",
                "Admits mistakes without being asked",
                "Does not cheat or steal"
            ],
            "assessment_criteria": {
                "1": "Often dishonest, needs significant support",
                "2": "Sometimes honest, improving with guidance",
                "3": "Usually honest in most situations",
                "4": "Consistently honest and encourages honesty in others"
            }
        },
        {
            "name": "Justice",
            "description": "Treating others fairly and standing up for what is right",
            "domain": CharacterDomain.MORAL_VALUES,
            "educational_level_id": jhs_level.id if jhs_level else None,
            "behavioral_indicators": [
                "Treats all classmates fairly",
                "Speaks up against unfair treatment",
                "Shares resources equitably"
            ],
            "assessment_criteria": {
                "1": "Rarely demonstrates fairness",
                "2": "Sometimes acts fairly with guidance",
                "3": "Usually demonstrates fairness",
                "4": "Consistently promotes justice and fairness"
            }
        },
        
        # Cultural Values
        {
            "name": "Respect for Elders",
            "description": "Showing proper respect and deference to older people and authority figures",
            "domain": CharacterDomain.CULTURAL_VALUES,
            "educational_level_id": kg_level.id if kg_level else None,
            "behavioral_indicators": [
                "Greets elders appropriately",
                "Listens when elders speak",
                "Uses respectful language with adults"
            ],
            "assessment_criteria": {
                "1": "Rarely shows respect to elders",
                "2": "Sometimes respectful with reminders",
                "3": "Usually shows appropriate respect",
                "4": "Consistently respectful and models behavior for others"
            }
        },
        {
            "name": "Cultural Pride",
            "description": "Appreciating and celebrating Ghanaian culture and traditions",
            "domain": CharacterDomain.CULTURAL_VALUES,
            "educational_level_id": primary_level.id if primary_level else None,
            "behavioral_indicators": [
                "Participates in cultural activities",
                "Shows interest in local traditions",
                "Speaks positively about Ghanaian culture"
            ],
            "assessment_criteria": {
                "1": "Shows little interest in cultural activities",
                "2": "Sometimes participates in cultural activities",
                "3": "Actively participates and shows cultural pride",
                "4": "Enthusiastically promotes and shares cultural knowledge"
            }
        },
        
        # Civic Values
        {
            "name": "Patriotism",
            "description": "Love for and devotion to Ghana and its people",
            "domain": CharacterDomain.CIVIC_VALUES,
            "educational_level_id": primary_level.id if primary_level else None,
            "behavioral_indicators": [
                "Participates respectfully in national activities",
                "Shows pride in being Ghanaian",
                "Cares for national symbols and property"
            ],
            "assessment_criteria": {
                "1": "Shows little national pride or awareness",
                "2": "Sometimes demonstrates patriotic behavior",
                "3": "Usually shows love for country",
                "4": "Consistently demonstrates strong patriotism and inspires others"
            }
        },
        {
            "name": "Civic Responsibility",
            "description": "Understanding and fulfilling duties as a citizen",
            "domain": CharacterDomain.CIVIC_VALUES,
            "educational_level_id": shs_level.id if shs_level else None,
            "behavioral_indicators": [
                "Participates in community service",
                "Follows rules and regulations",
                "Contributes to school and community improvement"
            ],
            "assessment_criteria": {
                "1": "Rarely fulfills civic duties",
                "2": "Sometimes participates in civic activities",
                "3": "Usually demonstrates civic responsibility",
                "4": "Consistently leads civic initiatives and inspires others"
            }
        },
        
        # Social Values
        {
            "name": "Compassion",
            "description": "Showing kindness and concern for others' suffering or needs",
            "domain": CharacterDomain.SOCIAL_VALUES,
            "educational_level_id": kg_level.id if kg_level else None,
            "behavioral_indicators": [
                "Helps classmates in need",
                "Shows concern for others' feelings",
                "Comforts those who are sad or hurt"
            ],
            "assessment_criteria": {
                "1": "Rarely shows concern for others",
                "2": "Sometimes shows compassion with encouragement",
                "3": "Usually demonstrates compassion",
                "4": "Consistently compassionate and teaches others to care"
            }
        },
        {
            "name": "Cooperation",
            "description": "Working together harmoniously with others to achieve common goals",
            "domain": CharacterDomain.SOCIAL_VALUES,
            "educational_level_id": primary_level.id if primary_level else None,
            "behavioral_indicators": [
                "Works well in group activities",
                "Shares materials and resources",
                "Helps resolve conflicts peacefully"
            ],
            "assessment_criteria": {
                "1": "Rarely cooperates, often causes conflicts",
                "2": "Sometimes cooperates with support",
                "3": "Usually cooperates well with others",
                "4": "Consistently promotes cooperation and teamwork"
            }
        },
        
        # Personal Values
        {
            "name": "Self-Discipline",
            "description": "Controlling one's behavior and emotions to achieve goals",
            "domain": CharacterDomain.PERSONAL_VALUES,
            "educational_level_id": primary_level.id if primary_level else None,
            "behavioral_indicators": [
                "Completes tasks without constant supervision",
                "Controls emotions appropriately",
                "Follows rules even when not watched"
            ],
            "assessment_criteria": {
                "1": "Lacks self-control, needs constant supervision",
                "2": "Sometimes demonstrates self-discipline",
                "3": "Usually shows good self-discipline",
                "4": "Consistently self-disciplined and helps others develop self-control"
            }
        },
        {
            "name": "Perseverance",
            "description": "Continuing to work hard despite difficulties or setbacks",
            "domain": CharacterDomain.PERSONAL_VALUES,
            "educational_level_id": jhs_level.id if jhs_level else None,
            "behavioral_indicators": [
                "Continues working when tasks are difficult",
                "Doesn't give up easily",
                "Learns from mistakes and tries again"
            ],
            "assessment_criteria": {
                "1": "Gives up easily when faced with challenges",
                "2": "Sometimes perseveres with encouragement",
                "3": "Usually perseveres through difficulties",
                "4": "Consistently demonstrates perseverance and motivates others"
            }
        }
    ]
    
    for trait_data in traits_data:
        existing_trait = CharacterTrait.query.filter_by(
            name=trait_data["name"],
            educational_level_id=trait_data["educational_level_id"]
        ).first()
        
        if not existing_trait:
            trait = CharacterTrait(**trait_data)
            db.session.add(trait)
    
    db.session.commit()
    print("Default character traits created successfully!")

def create_default_character_activities():
    """Create default character development activities"""
    
    # Get educational levels
    kg_level = EducationalLevel.query.filter_by(name="Kindergarten").first()
    primary_level = EducationalLevel.query.filter_by(name="Primary").first()
    jhs_level = EducationalLevel.query.filter_by(name="Junior High School").first()
    
    activities_data = [
        {
            "title": "Anansi Stories for Character Building",
            "description": "Traditional Anansi stories that teach moral lessons about honesty, wisdom, and consequences of actions",
            "activity_type": "story_telling",
            "duration_minutes": 30,
            "group_size": "whole_class",
            "educational_level_id": kg_level.id if kg_level else None,
            "subject_integration": ["English Language", "Ghanaian Language", "Creative Arts"],
            "primary_domain": CharacterDomain.MORAL_VALUES,
            "materials_needed": ["Anansi storybooks", "Pictures or puppets", "Discussion questions"],
            "preparation_time": 15,
            "assessment_method": "Observe student responses and participation in discussions",
            "cultural_context": "Akan",
            "local_proverbs": [
                "Se wo were fi na wosankofa a yenkyi - It is not wrong to go back for that which you have forgotten",
                "Obi nkyere abofra Nyame - No one teaches a child about God"
            ]
        },
        {
            "title": "Community Helper Role Play",
            "description": "Students role-play different community helpers to understand civic responsibility and service",
            "activity_type": "role_play",
            "duration_minutes": 45,
            "group_size": "small_group",
            "educational_level_id": primary_level.id if primary_level else None,
            "subject_integration": ["Social Studies", "Creative Arts", "English Language"],
            "primary_domain": CharacterDomain.CIVIC_VALUES,
            "materials_needed": ["Costumes or props", "Role cards", "Scenario descriptions"],
            "preparation_time": 20,
            "assessment_method": "Evaluate understanding of roles and demonstration of civic values",
            "cultural_context": "General Ghanaian",
            "local_proverbs": [
                "Baako pe a, enkum oman - One person alone cannot rule a nation"
            ]
        },
        {
            "title": "Gratitude Circle",
            "description": "Daily circle time where students share things they are grateful for",
            "activity_type": "reflection",
            "duration_minutes": 15,
            "group_size": "whole_class",
            "educational_level_id": kg_level.id if kg_level else None,
            "subject_integration": ["Religious and Moral Education", "English Language"],
            "primary_domain": CharacterDomain.RELIGIOUS_VALUES,
            "materials_needed": ["Talking stick or object", "Gratitude journal"],
            "preparation_time": 5,
            "assessment_method": "Observe student participation and genuine expression of gratitude",
            "cultural_context": "General Ghanaian",
            "local_proverbs": [
                "Aseda ne adom - Gratitude brings blessings"
            ]
        },
        {
            "title": "Conflict Resolution Workshop",
            "description": "Teaching students traditional and modern methods of resolving conflicts peacefully",
            "activity_type": "workshop",
            "duration_minutes": 60,
            "group_size": "whole_class",
            "educational_level_id": jhs_level.id if jhs_level else None,
            "subject_integration": ["Social Studies", "Religious and Moral Education"],
            "primary_domain": CharacterDomain.SOCIAL_VALUES,
            "materials_needed": ["Scenario cards", "Mediation guidelines", "Flip chart paper"],
            "preparation_time": 25,
            "assessment_method": "Role-play assessment and peer feedback on conflict resolution skills",
            "cultural_context": "General Ghanaian",
            "local_proverbs": [
                "Asomdwee mu na nkosua - In peace lies progress"
            ]
        },
        {
            "title": "Cultural Heritage Presentation",
            "description": "Students research and present on different Ghanaian cultural practices and their moral significance",
            "activity_type": "presentation",
            "duration_minutes": 90,
            "group_size": "small_group",
            "educational_level_id": jhs_level.id if jhs_level else None,
            "subject_integration": ["Social Studies", "Ghanaian Language", "Creative Arts"],
            "primary_domain": CharacterDomain.CULTURAL_VALUES,
            "materials_needed": ["Research materials", "Presentation tools", "Cultural artifacts"],
            "preparation_time": 30,
            "assessment_method": "Evaluate research quality, presentation skills, and cultural understanding",
            "cultural_context": "Multi-ethnic Ghanaian",
            "local_proverbs": [
                "Sankofa - Go back and get it (learn from the past)"
            ]
        }
    ]
    
    for activity_data in activities_data:
        existing_activity = CharacterActivity.query.filter_by(
            title=activity_data["title"]
        ).first()
        
        if not existing_activity:
            activity = CharacterActivity(**activity_data)
            db.session.add(activity)
    
    db.session.commit()
    print("Default character activities created successfully!")

def create_default_values_resources():
    """Create default values education resources"""
    
    kg_level = EducationalLevel.query.filter_by(name="Kindergarten").first()
    primary_level = EducationalLevel.query.filter_by(name="Primary").first()
    
    resources_data = [
        {
            "title": "Ghanaian Folk Tales Collection",
            "description": "Collection of traditional Ghanaian stories that teach moral values",
            "resource_type": "story",
            "format": "digital",
            "language": "English",
            "educational_level_id": kg_level.id if kg_level else None,
            "character_domains": ["moral_values", "cultural_values"],
            "duration_minutes": 20,
            "difficulty_level": "beginner",
            "cultural_background": "Multi-ethnic Ghanaian",
            "moral_lessons": [
                "Honesty is always the best policy",
                "Hard work leads to success",
                "Respect for elders brings blessings"
            ],
            "discussion_questions": [
                "What did the main character learn?",
                "How can we apply this lesson in our lives?",
                "What would you have done differently?"
            ]
        },
        {
            "title": "Values in Action Video Series",
            "description": "Short videos showing children demonstrating positive character traits in daily life",
            "resource_type": "video",
            "format": "digital",
            "language": "English",
            "educational_level_id": primary_level.id if primary_level else None,
            "character_domains": ["social_values", "personal_values"],
            "duration_minutes": 15,
            "difficulty_level": "intermediate",
            "cultural_background": "Ghanaian urban and rural settings",
            "moral_lessons": [
                "Helping others brings joy",
                "Perseverance overcomes challenges",
                "Cooperation achieves more than competition"
            ],
            "discussion_questions": [
                "How did the children show good character?",
                "When have you acted similarly?",
                "What character trait would you like to develop?"
            ]
        }
    ]
    
    for resource_data in resources_data:
        existing_resource = ValuesEducationResource.query.filter_by(
            title=resource_data["title"]
        ).first()
        
        if not existing_resource:
            resource = ValuesEducationResource(**resource_data)
            db.session.add(resource)
    
    db.session.commit()
    print("Default values education resources created successfully!")

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        print("Creating character development framework...")
        
        # Create database tables
        db.create_all()
        
        # Populate with default data
        create_default_character_traits()
        create_default_character_activities()
        create_default_values_resources()
        
        print("Character development framework created successfully!")