#!/bin/bash

# Script to insert sample records into School Timetable Manager
# Make sure Django backend is running on http://localhost:8000

BASE_URL="http://localhost:8000/api"
ADMIN_USER="admin_s1_a1"
ADMIN_PASS="ajinkya123"

echo "🎓 SCHOOL TIMETABLE - SAMPLE DATA INSERTION"
echo "=========================================="

# Step 1: Login and get token
echo ""
echo "📝 Step 1: Logging in as $ADMIN_USER..."

LOGIN_RESPONSE=$(curl -s -X POST \
  "$BASE_URL/login/" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$ADMIN_USER\", \"password\": \"$ADMIN_PASS\"}")

echo "Login Response: $LOGIN_RESPONSE"

# Extract token and school_id
# Note: Response uses "access" not "access_token", and "user" object contains school info
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access":"[^"]*' | cut -d'"' -f4)
SCHOOL_ID=$(echo $LOGIN_RESPONSE | grep -o '"school":{"id":[0-9]*' | grep -o '[0-9]*$')
USER_FIRST=$(echo $LOGIN_RESPONSE | grep -o '"first_name":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed! Could not get token."
  echo "   Response: $LOGIN_RESPONSE"
  echo "   Make sure your Django backend is running on $BASE_URL"
  exit 1
fi

if [ -z "$SCHOOL_ID" ]; then
  echo "⚠️  Warning: Could not extract school ID from response"
  echo "   You may need to update the school ID extraction logic"
  echo "   Response was: $LOGIN_RESPONSE"
fi

echo "✅ Login successful!"
echo "   Token: ${TOKEN:0:20}..."
echo "   School ID: $SCHOOL_ID"

# Set authorization header
HEADERS="Authorization: Bearer $TOKEN"
CONTENT_TYPE="Content-Type: application/json"

# Step 2: Create Teachers
echo ""
echo "👨‍🏫 Step 2: Creating Teachers..."

TEACHERS=()

create_teacher() {
  local first_name=$1
  local last_name=$2
  local email=$3
  local username=$4
  
  echo "   Creating: $first_name $last_name..."
  
  RESPONSE=$(curl -s -X POST \
    "$BASE_URL/students/create/" \
    -H "$HEADERS" \
    -H "$CONTENT_TYPE" \
    -d "{
      \"username\": \"$username\",
      \"first_name\": \"$first_name\",
      \"last_name\": \"$last_name\",
      \"email\": \"$email\",
      \"user_type\": \"teacher\",
      \"password\": \"password123\"
    }")
  
  TEACHER_ID=$(echo $RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*$')
  
  if [ ! -z "$TEACHER_ID" ]; then
    echo "      ✅ Created (ID: $TEACHER_ID)"
    TEACHERS+=("$TEACHER_ID")
  else
    echo "      ⚠️  Response: $RESPONSE"
  fi
}

create_teacher "John" "Smith" "john.smith@school.com" "teacher_john"
create_teacher "Sarah" "Johnson" "sarah.johnson@school.com" "teacher_sarah"
create_teacher "David" "Brown" "david.brown@school.com" "teacher_david"
create_teacher "Emily" "Davis" "emily.davis@school.com" "teacher_emily"
create_teacher "Robert" "Wilson" "robert.wilson@school.com" "teacher_robert"

echo ""
echo "📊 Summary:"
echo "   Total Teachers created: ${#TEACHERS[@]}"
echo ""
echo "Teacher IDs: ${TEACHERS[@]}"

# Final Summary
echo ""
echo "=========================================="
echo "✅ SAMPLE DATA INSERTION COMPLETED!"
echo "=========================================="
echo ""
echo "Created:"
echo "  • ${#TEACHERS[@]} Teachers"
echo ""
echo "Teacher Details:"
for i in "${!TEACHERS[@]}"; do
  echo "  $((i+1)). ID: ${TEACHERS[$i]}"
done
echo ""
echo "🚀 You can now login and view the teachers in the frontend!"
echo ""
