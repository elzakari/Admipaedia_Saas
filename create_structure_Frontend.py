import os

# Define the directory structure as a nested dictionary
structure = {
    "frontend": {
        "public": {},  # Static assets
        "src": {
            "app": {
                "files": ["App.tsx", "AppRoutes.tsx", "AppLayout.tsx", "store.js"],
            },
            "components": {
                "common": {
                    "files": [
                        "Button.tsx",
                        "Card.tsx",
                        "Table.tsx",
                        "Modal.tsx",
                        "Dropdown.tsx",
                        "Pagination.tsx",
                    ],
                },
                "layout": {
                    "files": ["Header.tsx", "Sidebar.tsx", "Footer.tsx"],
                },
                "dashboard": {
                    "files": [
                        "StatisticsGrid.tsx",
                        "CalendarWidget.tsx",
                        "NotificationList.tsx",
                    ],
                },
                "students": {
                    "files": [
                        "StudentList.tsx",
                        "StudentForm.tsx",
                        "StudentProfile.tsx",
                        "AttendanceForm.tsx",
                    ],
                },
                "teachers": {},
                "parents": {},
                "academics": {},
                "administration": {},
                "communication": {},
            },
            "contexts": {
                "files": [
                    "AuthContext.tsx",
                    "ThemeContext.tsx",
                    "NotificationContext.tsx",
                ],
            },
            "hooks": {
                "files": [
                    "useAuth.js",
                    "useApi.js",
                    "useOffline.js",
                    "useForm.js",
                ],
            },
            "lib": {
                "files": [
                    "api.js",
                    "storage.js",
                    "validation.js",
                    "date.js",
                ],
            },
            "pages": {
                "auth": {
                    "files": [
                        "LoginPage.tsx",
                        "RegisterPage.tsx",
                        "ForgotPasswordPage.tsx",
                    ],
                },
                "dashboard": {
                    "files": [
                        "AdminDashboard.tsx",
                        "TeacherDashboard.tsx",
                        "StudentDashboard.tsx",
                        "ParentDashboard.tsx",
                    ],
                },
                "students": {
                    "files": [
                        "StudentsPage.tsx",
                        "StudentDetailPage.tsx",
                        "StudentAttendancePage.tsx",
                        "StudentGradesPage.tsx",
                    ],
                },
                "teachers": {},
                "parents": {},
                "academics": {},
                "administration": {},
                "communication": {},
            },
            "services": {
                "files": [
                    "authService.js",
                    "studentService.js",
                    "teacherService.js",
                    "parentService.js",
                    "academicsService.js",
                    "administrationService.js",
                    "communicationService.js",
                ],
            },
            "store": {
                "slices": {
                    "files": [
                        "authSlice.js",
                        "studentSlice.js",
                        "teacherSlice.js",
                        "parentSlice.js",
                        "academicsSlice.js",
                        "administrationSlice.js",
                        "communicationSlice.js",
                    ],
                },
                "actions": {},
                "selectors": {},
            },
            "styles": {
                "themes": {
                    "files": ["light.css", "dark.css"],
                },
                "components": {},
                "files": ["globals.css", "variables.css"],
            },
            "types": {
                "files": [
                    "auth.types.ts",
                    "student.types.ts",
                    "teacher.types.ts",
                    "parent.types.ts",
                    "academics.types.ts",
                    "administration.types.ts",
                    "communication.types.ts",
                ],
            },
            "utils": {
                "files": [
                    "formatters.js",
                    "validators.js",
                    "permissions.js",
                    "offline.js",
                    "analytics.js",
                ],
            },
            "files": ["index.tsx", "index.css"],
        },
        "files": [".env", "package.json", "tailwind.config.js"],
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
