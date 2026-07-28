from app.schemas.user import RoleSchema, UserSchema

from .admission import (AdmissionApplicationSchema, BuyFormSchema,
                        SubmitFormSchema)
from .attendance import (AttendanceBulkCreateSchema, AttendanceCreateSchema,
                         AttendanceSchema, AttendanceUpdateSchema)
from .class_ import (ClassCreateSchema, ClassListSchema, ClassSchema,
                     ClassUpdateSchema)
from .curriculum import (CurriculumCreateSchema, CurriculumListSchema,
                         CurriculumSchema, CurriculumUpdateSchema)
from .curriculum_unit import (CurriculumUnitCreateSchema, CurriculumUnitSchema,
                              CurriculumUnitUpdateSchema)
from .grade import GradeCreateSchema, GradeSchema, GradeUpdateSchema
from .notification import (NotificationCreateSchema, NotificationListSchema,
                           NotificationSchema, NotificationUpdateSchema)
from .student import StudentCreateSchema, StudentSchema, StudentUpdateSchema
from .subject import (SubjectCreateSchema, SubjectListSchema, SubjectSchema,
                      SubjectUpdateSchema)
