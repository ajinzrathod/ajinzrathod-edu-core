# SchoolCore - Getting Started

A comprehensive school management system with Django backend and React frontend for managing students, attendance, timetables, and more.

## Prerequisites

- **Python** 3.8 or higher
- **Node.js** 16 or higher
- **PostgreSQL** (or update `settings.py` for your database)
- **pip** and **npm** package managers

## Quick Start

### 1. Backend Setup

```bash
# Navigate to backend directory
cd schoolcore-backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # macOS/Linux
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# (Optional) Generate sample data
python generate_comprehensive_data.py

# Start development server
python manage.py runserver
```

Backend runs on: **http://localhost:8000**

### 2. Frontend Setup

```bash
# Navigate to frontend directory (choose one)
cd schoolcore-frontend
# or
cd school-timetable

# Install dependencies
npm install

# Start development server
npm run dev  # or npm start
```

Frontend runs on: **http://localhost:3000** (or as shown in terminal)

## Default Admin Credentials

After running `generate_comprehensive_data.py`:

- **Username:** `admin_s1_a1`
- **Password:** `admin123`

## Access Points

| Service | URL                     |
|---------|-------------------------|
| Backend API | http://localhost:8000   |
| Django Admin | http://localhost:8000/ws |
| Frontend | http://localhost:3000   |

## Database Setup

Update `schoolcore-backend/schoolcore/settings.py` if using a different database:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'your_db_name',
        'USER': 'your_user',
        'PASSWORD': 'your_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

Then run migrations:
```bash
python manage.py migrate
```

## Features

- 👥 Multi-school user management
- 📚 Student enrollment across multiple academic years
- 📋 Attendance tracking with detailed records
- 📅 Timetable management
- 🎯 Academic year configuration
- 🏫 Classroom management
- 🔐 Role-based access control (Admin, Teacher, Student)

## Sample Data

The `generate_comprehensive_data.py` script creates:

- **2 Schools** with 2 admins each
- **3 Academic Years** (2023-24, 2024-25, 2025-26)
- **45 Classrooms** (15 per year)
- **10,000+ Student Records** with varied enrollment
- **15 Indian Holidays** per year
- **Attendance Records** with realistic patterns (60-100% attendance rates)

## Troubleshooting

**Port Already in Use:**
```bash
# Backend on different port
python manage.py runserver 8001

# Frontend on different port (check vite.config.js)
npm run dev -- --port 3001
```

**Database Errors:**
```bash
# Reset migrations
python manage.py migrate records zero
python manage.py migrate
```

**Missing Dependencies:**
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

## Project Structure

```
schoolcore/
├── schoolcore-backend/     # Django REST API
│   ├── records/           # Attendance & student records
│   ├── timetable/         # Timetable management
│   └── schoolcore/        # Main Django config
├── schoolcore-frontend/   # React frontend (main)
└── school-timetable/      # Alternative React frontend
```

## License

Internal use only.

## Screenshots
<img width="1497" height="726" alt="image" src="https://github.com/user-attachments/assets/20de93b2-ea1f-4d56-ba69-f2cc7bba8523" />


<img width="1227" height="592" alt="image" src="https://github.com/user-attachments/assets/2f781fcd-b0a0-489b-9f81-ab799e1cc88f" />


<img width="1487" height="622" alt="image" src="https://github.com/user-attachments/assets/820d69df-c7b9-44e3-9084-f2b04b2d5a57" />


<img width="1497" height="627" alt="image" src="https://github.com/user-attachments/assets/e15cdd8b-f592-4114-8391-44ec180ed2e1" />


<img width="1204" height="560" alt="image" src="https://github.com/user-attachments/assets/7b694a34-d953-4929-b271-39e9eaf93bce" />


<img width="1258" height="649" alt="image" src="https://github.com/user-attachments/assets/cdfe0ab4-e0da-41d1-83e9-69f2d4fa61b5" />


<img width="1245" height="559" alt="image" src="https://github.com/user-attachments/assets/194384a9-6e9d-400b-9692-f068bce2a09e" />


<img width="1244" height="717" alt="image" src="https://github.com/user-attachments/assets/db9bae7a-b5b5-47fc-b0c6-2c0078dde814" />


<img width="1258" height="641" alt="image" src="https://github.com/user-attachments/assets/112d9f87-ea4e-4532-99e5-b5158ec0a78d" />


<img width="1201" height="621" alt="image" src="https://github.com/user-attachments/assets/06e7fdb4-0d01-4e08-afb9-e63ce392c33b" />


<img width="438" height="453" alt="image" src="https://github.com/user-attachments/assets/51c6797f-69b3-4bee-982c-a64f054864c8" />


<img width="266" height="314" alt="image" src="https://github.com/user-attachments/assets/19c9dc5c-470f-4a16-af18-83a31ef2828b" />

<img width="883" height="60" alt="Screenshot 2026-01-30 at 12 04 40" src="https://github.com/user-attachments/assets/a7d6d05b-bde7-4adf-af66-6f73c74e9413" />
