from unittest.mock import MagicMock, patch

from flask import g

from app.models.exam import Exam
from app.services.exam_service import ExamService


def test_get_exam_by_id_returns_model_even_when_dto_cache_is_warm(app):
    exam = MagicMock(spec=Exam)
    exam.id = 42

    with app.app_context():
        # get_exam_by_id must authorize the ORM resource through
        # _get_scoped_exam before consulting the DTO cache.
        # The cache is serialization acceleration, never an
        # authorization source.
        tenant_id = "11111111-1111-1111-1111-111111111111"
        branch_id = "22222222-2222-2222-2222-222222222222"

        g.tenant_id = tenant_id
        g.branch_id = branch_id

        with patch(
            "app.services.exam_service.ExamService._get_scoped_exam",
            return_value=exam,
        ) as mock_get_scoped_exam, patch(
            "app.services.exam_service.cache_service"
        ) as mock_cache, patch(
            "app.services.exam_service.exam_schema"
        ) as mock_schema:
            mock_cache.get.side_effect = [
                None,
                {"id": 42, "title": "Cached DTO"},
            ]
            mock_cache.SHORT_TTL = 60
            mock_schema.dump.return_value = {
                "id": 42,
                "title": "Cached DTO",
            }

            first_result = ExamService.get_exam_by_id(42)
            second_result = ExamService.get_exam_by_id(42)

            assert first_result is exam
            assert second_result is exam

            # Authorization must happen on every request even
            # when the DTO cache is already warm.
            assert mock_get_scoped_exam.call_count == 2
            mock_get_scoped_exam.assert_called_with(
                42,
                tenant_id=tenant_id,
                branch_id=branch_id,
            )

            mock_cache.set.assert_called_once_with(
                "exam:dto:42",
                {"id": 42, "title": "Cached DTO"},
                ttl=60,
            )

            mock_schema.dump.assert_called_once_with(exam)
