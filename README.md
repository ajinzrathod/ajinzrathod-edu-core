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
