from unittest.mock import MagicMock, patch

from app.models.exam import Exam
from app.services.exam_service import ExamService


def test_get_exam_by_id_returns_model_even_when_dto_cache_is_warm(app):
    exam = MagicMock(spec=Exam)
    exam.id = 42

    with app.app_context():
        with patch(
            "app.services.exam_service.ExamService._load_exam_model",
            return_value=exam,
        ) as mock_load_exam, patch(
            "app.services.exam_service.cache_service"
        ) as mock_cache, patch(
            "app.services.exam_service.exam_schema"
        ) as mock_schema:
            mock_cache.get.side_effect = [None, {"id": 42, "title": "Cached DTO"}]
            mock_cache.SHORT_TTL = 60
            mock_schema.dump.return_value = {"id": 42, "title": "Cached DTO"}

            first_result = ExamService.get_exam_by_id(42)
            second_result = ExamService.get_exam_by_id(42)

            assert first_result is exam
            assert second_result is exam
            assert mock_load_exam.call_count == 2
            mock_cache.set.assert_called_once_with(
                "exam:dto:42",
                {"id": 42, "title": "Cached DTO"},
                ttl=60,
            )
            mock_schema.dump.assert_called_once_with(exam)
