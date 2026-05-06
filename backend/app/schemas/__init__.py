from app.schemas.user import UserSchema, RoleSchema
from .student import StudentSchema, StudentCreateSchema, StudentUpdateSchema
from .class_ import ClassSchema, ClassCreateSchema, ClassUpdateSchema, ClassListSchema
from .subject import SubjectSchema, SubjectCreateSchema, SubjectUpdateSchema, SubjectListSchema
from .attendance import AttendanceSchema, AttendanceCreateSchema, AttendanceUpdateSchema, AttendanceBulkCreateSchema
from .curriculum import CurriculumSchema, CurriculumCreateSchema, CurriculumUpdateSchema, CurriculumListSchema
from .curriculum_unit import CurriculumUnitSchema, CurriculumUnitCreateSchema, CurriculumUnitUpdateSchema
from .grade import GradeSchema, GradeCreateSchema, GradeUpdateSchema
from .notification import NotificationSchema, NotificationCreateSchema, NotificationUpdateSchema, NotificationListSchema
from .admission import AdmissionApplicationSchema, BuyFormSchema, SubmitFormSchema