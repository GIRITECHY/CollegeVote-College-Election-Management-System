-- CollegeVote Database Schema
-- College Election Management System
-- Run this file to create all required tables

-- Create the database (run this manually if needed)
CREATE DATABASE IF NOT EXISTS collegevote;
USE collegevote;

-- ============================================
-- Table: admins
-- Stores administrator login credentials
-- ============================================
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Table: students
-- Stores registered student accounts
-- ============================================
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Table: elections
-- Stores election configuration and status
-- ============================================
CREATE TABLE IF NOT EXISTS elections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('draft', 'scheduled', 'open', 'closed') DEFAULT 'draft',
    results_visibility ENUM('after_close', 'live') DEFAULT 'after_close',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- End time must be after start time
    CHECK (end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Table: candidates
-- Stores candidate information for each election
-- ============================================
CREATE TABLE IF NOT EXISTS candidates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    election_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    description TEXT,
    photo_url VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Each candidate belongs to one election
    FOREIGN KEY (election_id) REFERENCES elections(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Table: votes
-- Records each student's vote in an election
-- ============================================
CREATE TABLE IF NOT EXISTS votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    election_id INT NOT NULL,
    student_id INT NOT NULL,
    candidate_id INT NOT NULL,
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- CRITICAL: Prevent duplicate votes
    -- A student can vote only ONCE per election
    UNIQUE KEY unique_vote (election_id, student_id),

    -- Foreign keys ensure data integrity
    FOREIGN KEY (election_id) REFERENCES elections(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Table: sessions
-- Stores authentication sessions (serverless-compatible)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT NOT NULL,
    user_type ENUM('student', 'admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,

    -- Index for cleanup of expired sessions
    INDEX idx_expires_at (expires_at),
    -- Index for quick session lookups by user
    INDEX idx_user (user_id, user_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Additional indexes for performance
-- ============================================
ALTER TABLE candidates ADD INDEX idx_election (election_id);
ALTER TABLE votes ADD INDEX idx_election_candidate (election_id, candidate_id);
ALTER TABLE students ADD INDEX idx_status (status);
