import os

from app.utils.avatar_utils import normalize_avatar_url_for_response


def test_normalize_avatar_url_returns_none_when_file_is_missing(app, tmp_path):
    with app.app_context():
        app.config['UPLOAD_FOLDER'] = str(tmp_path)

        value = normalize_avatar_url_for_response(
            '/api/v1/profile/avatar/missing-avatar.jpeg'
        )

        assert value is None


def test_normalize_avatar_url_keeps_existing_file(app, tmp_path):
    with app.app_context():
        app.config['UPLOAD_FOLDER'] = str(tmp_path)
        avatar_dir = tmp_path / 'avatars'
        avatar_dir.mkdir(parents=True, exist_ok=True)
        filename = 'existing-avatar.jpeg'
        (avatar_dir / filename).write_bytes(b'avatar-bytes')

        value = normalize_avatar_url_for_response(
            f'/api/v1/profile/avatar/{filename}'
        )

        assert value == f'/api/v1/profile/avatar/{filename}'


def test_normalize_avatar_url_checks_legacy_folder(app, tmp_path):
    with app.app_context():
        app.config['UPLOAD_FOLDER'] = str(tmp_path)
        legacy_dir = os.path.join(app.root_path, 'uploads', 'avatars')
        os.makedirs(legacy_dir, exist_ok=True)
        filename = 'legacy-avatar.jpeg'
        legacy_path = os.path.join(legacy_dir, filename)

        try:
            with open(legacy_path, 'wb') as avatar_file:
                avatar_file.write(b'avatar-bytes')

            value = normalize_avatar_url_for_response(
                f'/api/v1/profile/avatar/{filename}'
            )

            assert value == f'/api/v1/profile/avatar/{filename}'
        finally:
            if os.path.exists(legacy_path):
                os.remove(legacy_path)
