from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('records', '0002_alter_student_options_and_more'),
    ]

    operations = [
        # Create a trigger function to ensure a user can only be in ONE classroom per academic year
        migrations.RunSQL(
            sql="""
            CREATE OR REPLACE FUNCTION check_unique_user_per_academic_year()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Check if this user is already enrolled in a different classroom in the same academic year
                IF EXISTS (
                    SELECT 1 FROM records_student s1
                    WHERE s1.user_id = NEW.user_id
                    AND s1.classroom_id != NEW.classroom_id
                    AND s1.id != NEW.id
                    AND (SELECT academic_year_id FROM records_classroom WHERE id = s1.classroom_id)
                        = (SELECT academic_year_id FROM records_classroom WHERE id = NEW.classroom_id)
                    AND NEW.user_id IS NOT NULL
                    AND NEW.classroom_id IS NOT NULL
                ) THEN
                    RAISE EXCEPTION 'A student can only be enrolled in one classroom per academic year. User % is already in another classroom in that year.', NEW.user_id;
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            """,
            reverse_sql="""
            DROP FUNCTION IF EXISTS check_unique_user_per_academic_year();
            """,
            state_operations=[]
        ),
        # Create the trigger
        migrations.RunSQL(
            sql="""
            DROP TRIGGER IF EXISTS trg_unique_user_per_academic_year ON records_student;
            CREATE TRIGGER trg_unique_user_per_academic_year
            BEFORE INSERT OR UPDATE ON records_student
            FOR EACH ROW
            EXECUTE FUNCTION check_unique_user_per_academic_year();
            """,
            reverse_sql="""
            DROP TRIGGER IF EXISTS trg_unique_user_per_academic_year ON records_student;
            """,
            state_operations=[]
        ),
    ]
