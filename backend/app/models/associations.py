from app.extensions import db
from datetime import datetime

# Update the existing teacher_subjects table with any additional columns you need
teacher_subjects = db.Table('teacher_subjects',
    db.Column('teacher_id', db.Integer, db.ForeignKey('teachers.id'), primary_key=True),
    db.Column('subject_id', db.Integer, db.ForeignKey('subjects.id'), primary_key=True),
    db.Column('assigned_date', db.DateTime, default=datetime.utcnow),
    db.Column('is_primary', db.Boolean, default=False),
    extend_existing=True  # Add this line to allow redefining the table
)

# Define the class_subjects association table if it doesn't exist already
class_subjects = db.Table('class_subjects',
    db.Column('class_id', db.Integer, db.ForeignKey('classes.id'), primary_key=True),
    db.Column('subject_id', db.Integer, db.ForeignKey('subjects.id'), primary_key=True),
    db.Column('assigned_date', db.DateTime, default=datetime.utcnow)
)