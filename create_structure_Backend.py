import os

# Define the directory structure as a nested dictionary
structure = {
    "backend": {
        "app": {
            "files": ["__init__.py", "extensions.py", "config.py"],
            "api": {
                "v1": {
                    "files": ["__init__.py"],
                    "auth": {},
                    "academics": {},
                    "students": {},
                    "teachers": {},
                    "parents": {},
                    "administrative": {},
                    "dashboard": {},
                    "communication": {},
                }
            },
            "models": {
                "files": [
                    "__init__.py",
                    "user.py",
                    "student.py",
                    "teacher.py",
                    "parent.py",
                    "academic.py",
                    "attendance.py",
                    "grade.py",
                    "administration.py",
                    "communication.py",
                    "analytics.py",
                ],
            },
            "schemas": {
                "files": [
                    "__init__.py",
                    "user.py",
                    "student.py",
                    "teacher.py",
                    "parent.py",
                    "academic.py",
                    "attendance.py",
                    "grade.py",
                    "administration.py",
                    "communication.py",
                    "analytics.py",
                ],
            },
            "services": {
                "files": [
                    "__init__.py",
                    "auth_service.py",
                    "student_service.py",
                    "teacher_service.py",
                    "parent_service.py",
                    "academic_service.py",
                    "attendance_service.py",
                    "grade_service.py",
                    "admin_service.py",
                    "communication_service.py",
                    "analytics_service.py",
                ],
            },
            "utils": {
                "files": [
                    "__init__.py",
                    "security.py",
                    "validators.py",
                    "helpers.py",
                    "ai_utils.py",
                ],
            },
            "tasks": {
                "files": [
                    "__init__.py",
                    "notifications.py",
                    "reports.py",
                    "analytics.py",
                ],
            },
            "websockets": {
                "files": ["__init__.py", "chat.py", "notifications.py"],
            },
        },
        "migrations": {},
        "tests": {
            "files": ["__init__.py", "conftest.py"],
            "unit": {},
            "integration": {},
        },
        "files": [
            ".env",
            "app.py",
            "config.py",
            "db.py",
            "requirements.txt",
            "run.py",
        ],
    }
}


def create_structure(base_path, struct):
    """
    Recursively create directories and files based on the given structure.
    """
    for name, content in struct.items():
        path = os.path.join(base_path, name)
        if isinstance(content, dict):
            # If the content is a dictionary, it represents a directory
            os.makedirs(path, exist_ok=True)
            if "files" in content:
                # Create files inside the directory
                for file_name in content.get("files", []):
                    file_path = os.path.join(path, file_name)
                    open(file_path, "a").close()  # Create an empty file
            # Recursively process subdirectories
            create_structure(path, {k: v for k, v in content.items() if k != "files"})
        else:
            # If the content is not a dictionary, it represents a file
            open(path, "a").close()


# Main execution
if __name__ == "__main__":
    base_directory = os.getcwd()  # Use the current working directory as the base
    create_structure(base_directory, structure)
    print("Directory structure created successfully.")
