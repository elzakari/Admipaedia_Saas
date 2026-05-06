param()

function New-StudentUserAndProfile {
    param(
        [string]$AdminToken,
        [string]$Username,
        [string]$Email,
        [string]$Password,
        [hashtable]$ProfileOverrides,
        [int]$ExistingUserId = 0
    )

    # If ExistingUserId is provided, fully bypass register/login
    if ($ExistingUserId -gt 0) {
        $uid = [int]$ExistingUserId
    } else {
        $uid = 0

        # Try to register a fresh user
        $regBody = @{
            username = $Username
            email = $Email
            password = $Password
            confirm_password = $Password
            role = "student"
        } | ConvertTo-Json

        try {
            $reg = Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/v1/auth/register" -ContentType "application/json" -Body $regBody -MaximumRedirection 5 -ErrorAction Stop
            if ($reg.user_id) { $uid = [int]$reg.user_id }
            elseif ($reg.user -and $reg.user.id) { $uid = [int]$reg.user.id }
        } catch {
            $msg = $_.ErrorDetails.Message
            # If email is already registered, attempt login only if the provided password is correct
            if ($msg -match '"Email already registered"') {
                try {
                    $loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
                    $login = Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/v1/auth/login" -ContentType "application/json" -Body $loginBody -MaximumRedirection 5 -ErrorAction Stop
                    $stuToken = $login.access_token
                    $me = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/me" -Headers @{ Authorization = "Bearer $stuToken" } -MaximumRedirection 5 -ErrorAction Stop
                    $uid = [int]$me.user.id
                } catch {
                    throw "User exists but login failed (invalid credentials or rate limited). Provide -ExistingUserId or retry later."
                }
            } else {
                # Bubble up rate limit or other auth errors
                throw "Registration/login failed: $msg"
            }
        }
    }

    if ($uid -le 0) { throw "No valid user_id. Provide -ExistingUserId or retry after rate limits expire." }

    # Build student profile
    $studentBody = @{
        user_id = $uid
        first_name = "Test"
        middle_name = "T"
        last_name = "Student"
        date_of_birth = "2010-05-15"
        gender = "male"
        email = $Email
        phone = "1234567890"
        place_of_birth = "Cityville"
        religious_denomination = "None"
    }
    if ($ProfileOverrides) {
        foreach ($key in $ProfileOverrides.Keys) { $studentBody[$key] = $ProfileOverrides[$key] }
    }

    $studentJson = $studentBody | ConvertTo-Json
    $created = Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/v1/students/" -ContentType "application/json" -Headers @{ Authorization = "Bearer $AdminToken" } -Body $studentJson -MaximumRedirection 5 -ErrorAction Stop

    return [pscustomobject]@{
        userId    = $uid
        studentId = $created.student.id
        admission = $created.student.admission_number
    }
}

function Remove-Student {
    param(
        [string]$AdminToken,
        [int]$StudentId
    )

    if (-not $StudentId -or $StudentId -le 0) {
        Write-Error "Invalid StudentId: '$StudentId'."
        return $false
    }

    try {
        $exists = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/students/$StudentId" -Headers @{ Authorization = "Bearer $AdminToken" } -MaximumRedirection 5 -ErrorAction Stop
    } catch {
        Write-Output "Student $StudentId not found."
        return $false
    }

    # Optional pre-clean attendances (safe if cascade isn’t configured elsewhere)
    $att = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/attendances/?student_id=$StudentId&per_page=100" -Headers @{ Authorization = "Bearer $AdminToken" } -MaximumRedirection 5 -ErrorAction Stop
    if ($att.attendances) {
        $att.attendances | ForEach-Object {
            Invoke-RestMethod -Method Delete -Uri "http://localhost:5000/api/v1/attendances/$($_.id)" -Headers @{ Authorization = "Bearer $AdminToken" } -MaximumRedirection 5 -ErrorAction Stop | Out-Null
        }
    }

    $del = Invoke-RestMethod -Method Delete -Uri "http://localhost:5000/api/v1/students/$StudentId" -Headers @{ Authorization = "Bearer $AdminToken" } -MaximumRedirection 5 -ErrorAction Stop
    return [bool]$del.success
}