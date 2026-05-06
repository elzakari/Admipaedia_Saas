import requests
import json

# Base URL for API
BASE_URL = 'http://localhost:5000/api/v1'

# Function to print responses nicely
def print_response(response):
    print(f"Status Code: {response.status_code}")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
    print("\n" + "-"*50 + "\n")

# Step 1: Login to get JWT token
def login():
    print("\n=== STEP 1: Login to get JWT token ===")
    login_data = {
        "username": "admin",
        "password": "Admin@123"
    }
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    print_response(response)
    
    if response.status_code == 200:
        return response.json().get('access_token')
    else:
        raise Exception("Login failed")

# Step 2: Create a class
def create_class(token):
    print("\n=== STEP 2: Create a class ===")
    headers = {"Authorization": f"Bearer {token}"}
    class_data = {
        "name": "Test Class",
        "grade_level": "10",
        "academic_year": "2023-2024",
        "section": "A",
        "capacity": 30
    }
    response = requests.post(f"{BASE_URL}/classes", json=class_data, headers=headers)
    print_response(response)
    
    if response.status_code == 201:
        return response.json().get('class', {}).get('id')
    else:
        raise Exception("Class creation failed")

# Step 3: Create a student
def create_student(token):
    print("\n=== STEP 3: Create a student ===")
    headers = {"Authorization": f"Bearer {token}"}
    
    # First create a user for the student
    user_data = {
        "username": "teststudent",
        "email": "student@example.com",
        "password": "Student@123",
        "roles": ["student"]
    }
    user_response = requests.post(f"{BASE_URL}/auth/register", json=user_data, headers=headers)
    print("User creation response:")
    print_response(user_response)
    
    if user_response.status_code != 201:
        raise Exception("User creation failed")
    
    user_id = user_response.json().get('user', {}).get('id')
    
    # Now create the student profile
    student_data = {
        "user_id": user_id,
        "first_name": "Test",
        "last_name": "Student",
        "email": "student@example.com",
        "admission_number": "ADM-2023-00001",
        "date_of_birth": "2005-01-01",
        "gender": "male",
        "address": "123 Test St",
        "phone": "1234567890"
    }
    response = requests.post(f"{BASE_URL}/students", json=student_data, headers=headers)
    print("Student creation response:")
    print_response(response)
    
    if response.status_code == 201:
        return response.json().get('student', {}).get('id')
    else:
        raise Exception("Student creation failed")

# Step 4: Assign student to class
def assign_student_to_class(token, student_id, class_id):
    print("\n=== STEP 4: Assign student to class ===")
    headers = {"Authorization": f"Bearer {token}"}
    data = {"class_id": class_id}
    response = requests.put(f"{BASE_URL}/students/{student_id}/assign-class", json=data, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        raise Exception("Failed to assign student to class")

# Step 5: Get student details
def get_student(token, student_id):
    print("\n=== STEP 5: Get student details ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/students/{student_id}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        raise Exception("Failed to get student details")

# Step 6: Update student
def update_student(token, student_id):
    print("\n=== STEP 6: Update student ===")
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "first_name": "Updated",
        "last_name": "Student",
        "phone": "0987654321"
    }
    response = requests.put(f"{BASE_URL}/students/{student_id}", json=data, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        raise Exception("Failed to update student")

# Step 7: Delete student
def delete_student(token, student_id):
    print("\n=== STEP 7: Delete student ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.delete(f"{BASE_URL}/students/{student_id}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        raise Exception("Failed to delete student")

# Step 8: Verify student is deleted
def verify_student_deleted(token, student_id):
    print("\n=== STEP 8: Verify student is deleted ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/students/{student_id}", headers=headers)
    print_response(response)
    
    if response.status_code != 404:
        raise Exception("Student was not properly deleted")

# Main function to run the workflow
def run_workflow():
    try:
        # Login
        token = login()
        
        # Create class
        class_id = create_class(token)
        
        # Create student
        student_id = create_student(token)
        
        # Assign student to class
        assign_student_to_class(token, student_id, class_id)
        
        # Get student details
        get_student(token, student_id)
        
        # Update student
        update_student(token, student_id)
        
        # Delete student
        delete_student(token, student_id)
        
        # Verify student is deleted
        verify_student_deleted(token, student_id)
        
        print("\n✅ Workflow completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Workflow failed: {str(e)}")

if __name__ == "__main__":
    run_workflow()