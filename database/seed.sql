-- CollegeVote Seed Data
-- Demo data for testing the application
-- Passwords listed here are for DEVELOPMENT ONLY — never use these in production

USE collegevote;

-- ============================================
-- Admin account
-- Username: admin | Password: admin123
-- ============================================
INSERT INTO admins (username, password_hash) VALUES
('admin', '$2b$10$ZuyKKfGQhxmvScXXVXCaQuthipklpX6N/Q/WhOmFCc0ACrTqqj0By');

-- ============================================
-- Student accounts
-- All passwords: student123
-- ============================================
INSERT INTO students (student_id, name, department, password_hash, status) VALUES
('STU001', 'Rahul Sharma',    'Computer Science', '$2b$10$00IinjvipKfL.Hvx1VUlBOAbo04jl0GrG26CgQI/LgIHkcqdE8PZS', 'active'),
('STU002', 'Priya Patel',     'Electronics',      '$2b$10$urLmYqlCIqm.4giGsjUd1u04lqBllck/3fwhncnbyrtadi8BGQz9e', 'active'),
('STU003', 'Amit Kumar',      'Mechanical',       '$2b$10$RtlPWqw/E/jb7.POpmQgaujBiyl3uDZ5kn3NMAij8Celv4QNu41T.', 'active'),
('STU004', 'Sneha Reddy',     'Computer Science', '$2b$10$3ilzZVUMirGt6eXvAi1FL.MJkb10jaWkR5TyAbSLBwUPw1UJ5ywki', 'active'),
('STU005', 'Vikram Singh',    'Civil',            '$2b$10$QVX0VRoix7oRcBJh4WR96eGBCP4szFHXBwDY5lUPe9n9krzzGGRwy', 'active');

-- ============================================
-- Sample election
-- ============================================
INSERT INTO elections (title, description, start_time, end_time, status, results_visibility) VALUES
('Student Council President 2026', 
 'Annual election for the Student Council President. All active students are eligible to vote for their preferred candidate.',
 '2026-10-15 09:00:00', 
 '2026-10-20 17:00:00', 
 'draft', 
 'after_close');

-- ============================================
-- Sample candidates (for election ID 1)
-- ============================================
INSERT INTO candidates (election_id, name, department, position, description, photo_url) VALUES
(1, 'Ananya Desai', 'Computer Science', 'President',
 'Third-year CSE student with 2 years of student committee experience. Promises to improve campus Wi-Fi, introduce coding workshops, and create a student grievance portal.',
 NULL),
(1, 'Rohan Mehta', 'Electronics', 'President',
 'Final-year ECE student and current sports secretary. Plans to organize more inter-college events, upgrade lab equipment, and establish a student mentorship program.',
 NULL),
(1, 'Kavya Nair', 'Mechanical', 'President',
 'Third-year Mechanical student and debate club president. Aims to improve hostel facilities, launch a campus magazine, and create a transparent budget system for student funds.',
 NULL);
