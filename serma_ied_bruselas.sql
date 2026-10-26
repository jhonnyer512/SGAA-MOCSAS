-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 26-10-2026 a las 03:32:39
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `serma_ied_bruselas`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `analyst_course_subjects`
--

CREATE TABLE `analyst_course_subjects` (
  `user_id` char(36) NOT NULL,
  `course_id` char(36) NOT NULL,
  `subject_id` char(36) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `analyst_course_subjects`
--

INSERT INTO `analyst_course_subjects` (`user_id`, `course_id`, `subject_id`) VALUES
('701efaee-8a80-4582-a1d7-a4bb4df31da2', '66bfb5f3-8017-403e-838e-3f8412747aa3', 'e9a4af57-170b-471a-86fa-c6910e6f0d27'),
('c755d2c7-fd5d-4c41-9477-03ec0e7e5d46', '66bfb5f3-8017-403e-838e-3f8412747aa3', '46d33d10-ae3b-4a85-8f46-97cad6d37f1b');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `analyst_subjects`
--

CREATE TABLE `analyst_subjects` (
  `user_id` char(36) NOT NULL,
  `subject_id` char(36) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `analyst_subjects`
--

INSERT INTO `analyst_subjects` (`user_id`, `subject_id`) VALUES
('701efaee-8a80-4582-a1d7-a4bb4df31da2', 'e9a4af57-170b-471a-86fa-c6910e6f0d27'),
('c755d2c7-fd5d-4c41-9477-03ec0e7e5d46', '46d33d10-ae3b-4a85-8f46-97cad6d37f1b');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `courses`
--

CREATE TABLE `courses` (
  `id` char(36) NOT NULL,
  `grade_level` tinyint(3) UNSIGNED NOT NULL,
  `course_code` varchar(40) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `courses`
--

INSERT INTO `courses` (`id`, `grade_level`, `course_code`, `created_at`) VALUES
('66bfb5f3-8017-403e-838e-3f8412747aa3', 6, '601', '2026-10-18 04:52:58'),
('969a95a2-caae-11f1-ab1c-5cb47e887231', 8, '8°', '2026-10-18 04:44:22'),
('bb261bf9-d06c-4c99-9067-dba4298b0f64', 6, '602', '2026-10-26 01:46:16');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `family_students`
--

CREATE TABLE `family_students` (
  `user_id` char(36) NOT NULL,
  `student_id` char(36) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `family_students`
--

INSERT INTO `family_students` (`user_id`, `student_id`) VALUES
('0325ab2a-ab2f-4513-80c8-b42496f58d80', '82f4651f-bece-427d-96be-e457fbcf5aff');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `institution_settings`
--

CREATE TABLE `institution_settings` (
  `id` tinyint(4) NOT NULL,
  `school_name` varchar(120) NOT NULL,
  `passing_score` tinyint(3) UNSIGNED NOT NULL DEFAULT 60,
  `term` varchar(80) NOT NULL,
  `theme` enum('light','dark') NOT NULL DEFAULT 'light'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `institution_settings`
--

INSERT INTO `institution_settings` (`id`, `school_name`, `passing_score`, `term`, `theme`) VALUES
(1, 'Institución Educativa Departamental Bruselas', 60, '2026', 'light');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `login_attempts`
--

CREATE TABLE `login_attempts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `email` varchar(254) NOT NULL,
  `attempted_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `plans`
--

CREATE TABLE `plans` (
  `id` char(36) NOT NULL,
  `subject_id` char(36) NOT NULL,
  `title` varchar(160) NOT NULL,
  `guide` varchar(1000) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `plans`
--

INSERT INTO `plans` (`id`, `subject_id`, `title`, `guide`, `created_at`) VALUES
('7491606d-651e-43bb-b82d-dd40d6dbb59f', '46d33d10-ae3b-4a85-8f46-97cad6d37f1b', 'Ameriac Latina', '', '2026-10-18 04:31:58'),
('c457fbb2-a19d-4027-bcf1-4c400e246aaf', 'e9a4af57-170b-471a-86fa-c6910e6f0d27', 'Numeros romanos', '', '2026-10-18 04:32:40');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `plan_topics`
--

CREATE TABLE `plan_topics` (
  `id` char(36) NOT NULL,
  `plan_id` char(36) NOT NULL,
  `title` varchar(160) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `plan_topics`
--

INSERT INTO `plan_topics` (`id`, `plan_id`, `title`, `created_at`) VALUES
('0ecb0cf2-f08f-4591-ade4-540a795edb8c', '7491606d-651e-43bb-b82d-dd40d6dbb59f', 'Sociales', '2026-10-18 04:32:09'),
('6522adae-9008-40c2-9be1-e24996256ada', 'c457fbb2-a19d-4027-bcf1-4c400e246aaf', 'Numeros romanos', '2026-10-18 05:08:09'),
('9b648860-5744-4c5d-b0d6-7f635189a73f', '7491606d-651e-43bb-b82d-dd40d6dbb59f', 'eureca', '2026-10-18 04:32:22'),
('9eed4fe1-0ebb-4a8e-92bd-7ad0f7da10c7', 'c457fbb2-a19d-4027-bcf1-4c400e246aaf', 'sadadsa', '2026-10-18 04:32:44');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `progress`
--

CREATE TABLE `progress` (
  `id` char(36) NOT NULL,
  `student_id` char(36) NOT NULL,
  `subject_id` char(36) NOT NULL,
  `plan_id` char(36) DEFAULT NULL,
  `note` varchar(1000) NOT NULL,
  `completed` tinyint(1) NOT NULL DEFAULT 0,
  `observation` varchar(1000) DEFAULT NULL,
  `created_by` char(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `progress`
--

INSERT INTO `progress` (`id`, `student_id`, `subject_id`, `plan_id`, `note`, `completed`, `observation`, `created_by`, `created_at`) VALUES
('1598360a-7569-4883-91b9-704ada7eeb69', 'f410f978-bc2f-4f42-8a20-a430b8dc08b1', 'e9a4af57-170b-471a-86fa-c6910e6f0d27', 'c457fbb2-a19d-4027-bcf1-4c400e246aaf', 'termino el plan', 0, '', '701efaee-8a80-4582-a1d7-a4bb4df31da2', '2026-10-18 04:55:55');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `students`
--

CREATE TABLE `students` (
  `id` char(36) NOT NULL,
  `name` varchar(160) NOT NULL,
  `grade` varchar(40) NOT NULL,
  `course_id` char(36) NOT NULL,
  `code` varchar(40) DEFAULT NULL,
  `guardian` varchar(160) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `students`
--

INSERT INTO `students` (`id`, `name`, `grade`, `course_id`, `code`, `guardian`, `created_at`) VALUES
('3fde5d24-9513-481b-96fc-e12fe38fdc6a', 'Sergio Mauricio Alarcon Alarcon', '8°', '969a95a2-caae-11f1-ab1c-5cb47e887231', 'CGE3SF8', 'Jasinto pintor', '2026-10-18 04:01:06'),
('82f4651f-bece-427d-96be-e457fbcf5aff', 'Jhonnyer Yampier freneda malaver', ' · 602', 'bb261bf9-d06c-4c99-9067-dba4298b0f64', 'CGE3SF8', 'Jasinto pintor', '2026-10-26 01:48:22'),
('f410f978-bc2f-4f42-8a20-a430b8dc08b1', 'cristian Molina', ' · 601', '66bfb5f3-8017-403e-838e-3f8412747aa3', 'CGE3SF8', '', '2026-10-18 04:53:12');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `student_topic_progress`
--

CREATE TABLE `student_topic_progress` (
  `student_id` char(36) NOT NULL,
  `topic_id` char(36) NOT NULL,
  `starting_point` tinyint(1) NOT NULL DEFAULT 0,
  `research` tinyint(1) NOT NULL DEFAULT 0,
  `skill_development` tinyint(1) NOT NULL DEFAULT 0,
  `relation` tinyint(1) NOT NULL DEFAULT 0,
  `updated_by` char(36) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `student_topic_progress`
--

INSERT INTO `student_topic_progress` (`student_id`, `topic_id`, `starting_point`, `research`, `skill_development`, `relation`, `updated_by`, `updated_at`) VALUES
('82f4651f-bece-427d-96be-e457fbcf5aff', '0ecb0cf2-f08f-4591-ade4-540a795edb8c', 0, 0, 0, 0, NULL, '2026-10-26 01:48:22'),
('82f4651f-bece-427d-96be-e457fbcf5aff', '6522adae-9008-40c2-9be1-e24996256ada', 0, 0, 0, 0, NULL, '2026-10-26 01:48:22'),
('82f4651f-bece-427d-96be-e457fbcf5aff', '9b648860-5744-4c5d-b0d6-7f635189a73f', 0, 0, 0, 0, NULL, '2026-10-26 01:48:22'),
('82f4651f-bece-427d-96be-e457fbcf5aff', '9eed4fe1-0ebb-4a8e-92bd-7ad0f7da10c7', 0, 0, 0, 0, NULL, '2026-10-26 01:48:22'),
('f410f978-bc2f-4f42-8a20-a430b8dc08b1', '0ecb0cf2-f08f-4591-ade4-540a795edb8c', 1, 0, 0, 0, 'bc54204d-8fc5-4d8a-95fa-830985fd9e10', '2026-10-26 01:47:18'),
('f410f978-bc2f-4f42-8a20-a430b8dc08b1', '6522adae-9008-40c2-9be1-e24996256ada', 1, 0, 0, 0, '701efaee-8a80-4582-a1d7-a4bb4df31da2', '2026-10-18 05:08:28'),
('f410f978-bc2f-4f42-8a20-a430b8dc08b1', '9b648860-5744-4c5d-b0d6-7f635189a73f', 0, 0, 0, 0, NULL, '2026-10-18 04:53:12'),
('f410f978-bc2f-4f42-8a20-a430b8dc08b1', '9eed4fe1-0ebb-4a8e-92bd-7ad0f7da10c7', 1, 1, 1, 1, '701efaee-8a80-4582-a1d7-a4bb4df31da2', '2026-10-26 01:58:08');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `subjects`
--

CREATE TABLE `subjects` (
  `id` char(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `grade_level` tinyint(3) UNSIGNED NOT NULL DEFAULT 6,
  `teacher` varchar(120) DEFAULT NULL,
  `description` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `subjects`
--

INSERT INTO `subjects` (`id`, `name`, `grade_level`, `teacher`, `description`, `created_at`) VALUES
('46d33d10-ae3b-4a85-8f46-97cad6d37f1b', 'Sociales', 6, NULL, '', '2026-10-18 04:22:07'),
('e9a4af57-170b-471a-86fa-c6910e6f0d27', 'Matematicas', 6, '', '', '2026-10-18 04:03:27');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `id` char(36) NOT NULL,
  `name` varchar(120) NOT NULL,
  `email` varchar(254) NOT NULL,
  `role` enum('admin','analista','familia') NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `role`, `password_hash`, `active`, `created_at`) VALUES
('0325ab2a-ab2f-4513-80c8-b42496f58d80', 'Jaisnto pintor', 'jpintor@bruselas.edu.co', 'familia', '$argon2id$v=19$m=65536,t=4,p=1$QnFrb3NlNkRYa1hsQ0REUw$pF9afDhS9NvUu6WOQlwuH7/cCbUxlDYNbhPrvZqg1T0', 1, '2026-10-26 01:53:37'),
('701efaee-8a80-4582-a1d7-a4bb4df31da2', 'Juan carlos', 'juancarlos@example.com', 'analista', '$argon2id$v=19$m=65536,t=4,p=1$UWFqeHcxZ0c1Smh4TVlnTg$zzvegGSka4jzKl4a2uiwkNY6t8vE3CHMiAcxK02w3A0', 1, '2026-10-18 04:03:45'),
('bc54204d-8fc5-4d8a-95fa-830985fd9e10', 'Rectoría', 'rectoria@bruselas.edu.co', 'admin', '$argon2id$v=19$m=65536,t=4,p=1$dUVOMUtkbHZ1dzJNbFlGUQ$GGlUPcBbE1UeR5pG+ctHZURRnVRUQ01vb3NuIp+myXI', 1, '2026-10-25 16:54:33'),
('c755d2c7-fd5d-4c41-9477-03ec0e7e5d46', 'Cristian molina', 'crmolona@bruselas.edu.co', 'analista', '$argon2id$v=19$m=65536,t=4,p=1$akVSTHhNVDJ4TXc0OC50cg$LhAsJUm1q6W9/ghC1+rdLD4ptxG5G1eqireGJIjxZ6g', 1, '2026-10-25 17:31:07');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `analyst_course_subjects`
--
ALTER TABLE `analyst_course_subjects`
  ADD PRIMARY KEY (`user_id`,`course_id`,`subject_id`),
  ADD KEY `idx_analyst_course_subject` (`course_id`,`subject_id`),
  ADD KEY `fk_analyst_course_subject` (`subject_id`);

--
-- Indices de la tabla `analyst_subjects`
--
ALTER TABLE `analyst_subjects`
  ADD PRIMARY KEY (`user_id`,`subject_id`),
  ADD KEY `fk_analyst_subject` (`subject_id`);

--
-- Indices de la tabla `courses`
--
ALTER TABLE `courses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_course_grade_code` (`grade_level`,`course_code`);

--
-- Indices de la tabla `family_students`
--
ALTER TABLE `family_students`
  ADD PRIMARY KEY (`user_id`,`student_id`),
  ADD KEY `fk_family_student` (`student_id`);

--
-- Indices de la tabla `institution_settings`
--
ALTER TABLE `institution_settings`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `login_attempts`
--
ALTER TABLE `login_attempts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_login_attempts_email_time` (`email`,`attempted_at`);

--
-- Indices de la tabla `plans`
--
ALTER TABLE `plans`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_plan_subject` (`subject_id`);

--
-- Indices de la tabla `plan_topics`
--
ALTER TABLE `plan_topics`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_topic_plan` (`plan_id`,`created_at`);

--
-- Indices de la tabla `progress`
--
ALTER TABLE `progress`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_progress_student_subject` (`student_id`,`subject_id`),
  ADD KEY `fk_progress_subject` (`subject_id`),
  ADD KEY `fk_progress_plan` (`plan_id`),
  ADD KEY `fk_progress_creator` (`created_by`);

--
-- Indices de la tabla `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_student_course` (`course_id`);

--
-- Indices de la tabla `student_topic_progress`
--
ALTER TABLE `student_topic_progress`
  ADD PRIMARY KEY (`student_id`,`topic_id`),
  ADD KEY `fk_student_topic_topic` (`topic_id`),
  ADD KEY `fk_student_topic_user` (`updated_by`);

--
-- Indices de la tabla `subjects`
--
ALTER TABLE `subjects`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `login_attempts`
--
ALTER TABLE `login_attempts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `analyst_course_subjects`
--
ALTER TABLE `analyst_course_subjects`
  ADD CONSTRAINT `fk_analyst_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_analyst_course_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_analyst_course_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `analyst_subjects`
--
ALTER TABLE `analyst_subjects`
  ADD CONSTRAINT `fk_analyst_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_analyst_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `family_students`
--
ALTER TABLE `family_students`
  ADD CONSTRAINT `fk_family_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_family_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `plans`
--
ALTER TABLE `plans`
  ADD CONSTRAINT `fk_plan_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `plan_topics`
--
ALTER TABLE `plan_topics`
  ADD CONSTRAINT `fk_topic_plan` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `progress`
--
ALTER TABLE `progress`
  ADD CONSTRAINT `fk_progress_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_progress_plan` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_progress_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_progress_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `students`
--
ALTER TABLE `students`
  ADD CONSTRAINT `fk_student_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`);

--
-- Filtros para la tabla `student_topic_progress`
--
ALTER TABLE `student_topic_progress`
  ADD CONSTRAINT `fk_student_topic_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_student_topic_topic` FOREIGN KEY (`topic_id`) REFERENCES `plan_topics` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_student_topic_user` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
