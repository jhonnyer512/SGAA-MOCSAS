CREATE DATABASE IF NOT EXISTS serma_ied_bruselas
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE serma_ied_bruselas;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  role ENUM('admin','analista','familia') NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS students (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  grade VARCHAR(40) NOT NULL,
  code VARCHAR(40) NULL,
  guardian VARCHAR(160) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subjects (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  teacher VARCHAR(120) NULL,
  description VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS family_students (
  user_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  PRIMARY KEY (user_id, student_id),
  CONSTRAINT fk_family_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_family_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS analyst_subjects (
  user_id CHAR(36) NOT NULL,
  subject_id CHAR(36) NOT NULL,
  PRIMARY KEY (user_id, subject_id),
  CONSTRAINT fk_analyst_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_analyst_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS plans (
  id CHAR(36) PRIMARY KEY,
  student_id CHAR(36) NOT NULL,
  subject_id CHAR(36) NOT NULL,
  title VARCHAR(160) NOT NULL,
  guide VARCHAR(1000) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_plan_student_subject (student_id, subject_id),
  CONSTRAINT fk_plan_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_plan_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS progress (
  id CHAR(36) PRIMARY KEY,
  student_id CHAR(36) NOT NULL,
  subject_id CHAR(36) NOT NULL,
  plan_id CHAR(36) NULL,
  note VARCHAR(1000) NOT NULL,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  observation VARCHAR(1000) NULL,
  created_by CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_progress_student_subject (student_id, subject_id),
  CONSTRAINT fk_progress_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_progress_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT fk_progress_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL,
  CONSTRAINT fk_progress_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS institution_settings (
  id TINYINT PRIMARY KEY,
  school_name VARCHAR(120) NOT NULL,
  passing_score TINYINT UNSIGNED NOT NULL DEFAULT 60,
  term VARCHAR(80) NOT NULL,
  theme ENUM('light','dark') NOT NULL DEFAULT 'light'
) ENGINE=InnoDB;
INSERT INTO institution_settings (id, school_name, passing_score, term, theme)
VALUES (1, 'Institución Educativa Departamental Bruselas', 60, 'Periodo académico actual', 'light')
ON DUPLICATE KEY UPDATE id = VALUES(id);

CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login_attempts_email_time (email, attempted_at)
) ENGINE=InnoDB;
