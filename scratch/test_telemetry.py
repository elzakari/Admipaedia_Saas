from app import create_app

def test_telemetry_endpoint():
    app = create_app('testing')
    client = app.test_client()

    print("--- TEST 1: Valid payload without sensitive data ---")
    res = client.post('/api/v1/errors', json={"message": "Script failed to load", "file": "main.js"})
    print("Status:", res.status_code)
    print("Body:", res.get_json())
    assert res.status_code == 202
    assert res.get_json() == {"success": True}

    print("\n--- TEST 2: Malformed payload (String instead of Dict) ---")
    res = client.post('/api/v1/errors', data="Not a json", content_type="application/json")
    print("Status:", res.status_code)
    print("Body:", res.get_json())
    assert res.status_code == 202
    assert res.get_json() == {"success": True}

    print("\n--- TEST 3: Payload with sensitive credentials ---")
    res = client.post('/api/v1/errors', json={
        "message": "Failed API request",
        "access_token": "secret_jwt_token_123",
        "authorization": "Bearer supersecret",
        "password": "my_password",
        "email": "user@example.com",
        "other_data": "safe_information"
    })
    print("Status:", res.status_code)
    print("Body:", res.get_json())
    assert res.status_code == 202
    assert res.get_json() == {"success": True}

    print("\nALL TELEMETRY TESTS COMPLETED SUCCESSFULLY!")

if __name__ == '__main__':
    test_telemetry_endpoint()
