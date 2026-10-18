<?php
declare(strict_types=1);

ini_set('display_errors', '0');
ini_set('log_errors', '1');
header_remove('X-Powered-By');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
header("Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
header('Cache-Control: no-store');
header('Content-Type: application/json; charset=utf-8');

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => $https,
    'httponly' => true,
    'samesite' => 'Strict',
]);
if (!session_start()) {
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'PHP no pudo iniciar la sesión. Verifica el directorio session.save_path de XAMPP.'], JSON_UNESCAPED_UNICODE);
    exit;
}

function respond(int $status, array $payload): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function config(): array {
    static $value = null;
    if ($value !== null) return $value;
    $file = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'config.php';
    if (!is_file($file)) respond(503, ['error' => 'Falta configurar la conexión local. Revisa la guía de instalación.']);
    $value = require $file;
    return $value;
}

function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $c = config();
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $c['db_host'], (int)$c['db_port'], $c['db_name']);
    $pdo = new PDO($dsn, $c['db_user'], $c['db_password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function requestBody(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > 1048576) respond(413, ['error' => 'La solicitud es demasiado grande.']);
    $data = json_decode($raw, true);
    if (!is_array($data)) respond(400, ['error' => 'La solicitud no tiene un formato válido.']);
    return $data;
}

function cleanText(mixed $value, int $max = 160): string {
    if (!is_string($value)) return '';
    $value = trim($value);
    return mb_substr($value, 0, $max, 'UTF-8');
}

function uuid(): string {
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    $h = bin2hex($b);
    return substr($h,0,8).'-'.substr($h,8,4).'-'.substr($h,12,4).'-'.substr($h,16,4).'-'.substr($h,20,12);
}

function hashPassword(string $password): string {
    if (defined('PASSWORD_ARGON2ID') && in_array('argon2id', password_algos(), true)) {
        return password_hash($password, PASSWORD_ARGON2ID);
    }
    if (strlen($password) > 72) throw new LengthException('Password exceeds bcrypt byte limit');
    return password_hash($password, PASSWORD_DEFAULT);
}

function currentUser(): ?array {
    if (empty($_SESSION['user_id'])) return null;
    $stmt = db()->prepare('SELECT id,name,email,role,active FROM users WHERE id=? LIMIT 1');
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    if (!$user || !(bool)$user['active']) {
        $_SESSION = [];
        session_destroy();
        return null;
    }
    return $user;
}

function requireUser(?array $roles = null): array {
    $user = currentUser();
    if (!$user) respond(401, ['error' => 'Inicia sesión para continuar.']);
    if ($roles !== null && !in_array($user['role'], $roles, true)) respond(403, ['error' => 'No tienes permiso para realizar esta acción.']);
    return $user;
}

function checkMutation(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '') {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $expected = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? '');
        if (!hash_equals($expected, $origin)) respond(403, ['error' => 'Solicitud no válida.']);
    }
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (empty($_SESSION['csrf']) || !is_string($token) || !hash_equals($_SESSION['csrf'], $token)) {
        respond(403, ['error' => 'Solicitud no válida. Recarga la página e intenta de nuevo.']);
    }
}

function idsFor(string $table, string $column, string $userId): array {
    $allowed = ['family_students' => ['user_id','student_id'], 'analyst_subjects' => ['user_id','subject_id']];
    if (!isset($allowed[$table])) return [];
    [$userColumn,$idColumn] = $allowed[$table];
    $stmt = db()->prepare("SELECT `$idColumn` FROM `$table` WHERE `$userColumn`=?");
    $stmt->execute([$userId]);
    return array_column($stmt->fetchAll(), $idColumn);
}
function analystAssignments(string $userId): array {
    $stmt=db()->prepare('SELECT course_id AS courseId,subject_id AS subjectId FROM analyst_course_subjects WHERE user_id=?');
    $stmt->execute([$userId]); return $stmt->fetchAll();
}
function analystCanManage(string $userId,string $courseId,string $subjectId): bool {
    $stmt=db()->prepare('SELECT 1 FROM analyst_course_subjects WHERE user_id=? AND course_id=? AND subject_id=?');
    $stmt->execute([$userId,$courseId,$subjectId]); return (bool)$stmt->fetchColumn();
}
function analystCanManageSubject(string $userId,string $subjectId): bool {
    $stmt=db()->prepare('SELECT 1 FROM analyst_course_subjects a JOIN courses c ON c.id=a.course_id JOIN subjects s ON s.id=a.subject_id AND s.grade_level=c.grade_level WHERE a.user_id=? AND a.subject_id=? LIMIT 1');
    $stmt->execute([$userId,$subjectId]); return (bool)$stmt->fetchColumn();
}
function courseRows(): array {
    // Avoid comparing course_code with CAST(grade_level AS CHAR): the former
    // inherits the table collation while the cast inherits the connection
    // collation, which can differ in existing XAMPP databases.
    return fetchScoped("SELECT c.id,c.grade_level AS gradeLevel,c.course_code AS courseCode,CASE WHEN c.course_code REGEXP CONCAT('^',c.grade_level,'(°|º|[[:space:]])') THEN c.course_code ELSE CONCAT(c.grade_level,'° · ',c.course_code) END AS label FROM courses c ORDER BY c.grade_level,c.course_code",[]);
}

function placeholders(array $values): string { return implode(',', array_fill(0, count($values), '?')); }
function fetchScoped(string $sql, array $args): array {
    if (!$args && str_contains($sql, '?')) return [];
    $stmt = db()->prepare($sql);
    $stmt->execute($args);
    return $stmt->fetchAll();
}
function gradeLevel(string $grade): int {
    return preg_match('/(?<!\d)(6|7|8|9|10|11)(?!\d)/u', $grade, $match) ? (int)$match[1] : 0;
}
function subjectSelectSql(): string {
    return "SELECT s.id,s.name,s.grade_level AS gradeLevel,COALESCE(NULLIF(GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', '),''),s.teacher) AS teacher,s.description FROM subjects s LEFT JOIN analyst_subjects ax ON ax.subject_id=s.id LEFT JOIN users u ON u.id=ax.user_id AND u.role='analista' AND u.active=1";
}
function subjectRows(string $where = '', array $args = []): array {
    return fetchScoped(subjectSelectSql() . ($where !== '' ? ' ' . $where : '') . ' GROUP BY s.id ORDER BY s.grade_level,s.name', $args);
}
function visibleStudents(array $user): array {
    if ($user['role'] === 'admin') return fetchScoped('SELECT s.id,s.name,s.grade,s.course_id AS courseId,c.grade_level AS gradeLevel,c.course_code AS courseCode,s.code,s.guardian FROM students s JOIN courses c ON c.id=s.course_id ORDER BY s.name',[]);
    if ($user['role'] === 'analista') {
        $ids=array_values(array_unique(array_column(analystAssignments($user['id']),'courseId'))); if(!$ids)return [];
        return fetchScoped('SELECT s.id,s.name,s.grade,s.course_id AS courseId,c.grade_level AS gradeLevel,c.course_code AS courseCode,s.code,s.guardian FROM students s JOIN courses c ON c.id=s.course_id WHERE s.course_id IN ('.placeholders($ids).') ORDER BY s.name',$ids);
    }
    $ids = idsFor('family_students', 'student_id', $user['id']);
    if (!$ids) return [];
    return fetchScoped('SELECT s.id,s.name,s.grade,s.course_id AS courseId,c.grade_level AS gradeLevel,c.course_code AS courseCode,s.code,s.guardian FROM students s JOIN courses c ON c.id=s.course_id WHERE s.id IN (' . placeholders($ids) . ') ORDER BY s.name', $ids);
}
function visibleSubjects(array $user, array $studentIds): array {
    if ($user['role'] === 'admin') return subjectRows();
    if ($user['role'] === 'analista') {
        $ids = array_values(array_unique(array_column(analystAssignments($user['id']),'subjectId')));
        if (!$ids) return [];
        return subjectRows('WHERE s.id IN (' . placeholders($ids) . ')', $ids);
    }
    if (!$studentIds) return [];
    $gradeRows=fetchScoped('SELECT DISTINCT c.grade_level FROM students st JOIN courses c ON c.id=st.course_id WHERE st.id IN (' . placeholders($studentIds) . ')',$studentIds);
    $grades=array_values(array_unique(array_filter(array_map(fn($row)=>(int)$row['grade_level'],$gradeRows),fn($level)=>$level>=6&&$level<=11)));
    if(!$grades)return [];
    return subjectRows('WHERE s.grade_level IN (' . placeholders($grades) . ')',$grades);
}

try {
    $route = trim((string)($_GET['route'] ?? ''), '/');
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $pdo = db();

    if ($route === 'session' && $method === 'GET') {
        $user = currentUser();
        respond(200, ['user' => $user, 'csrf' => $user ? ($_SESSION['csrf'] ?? null) : null]);
    }

    if ($route === 'login' && $method === 'POST') {
        $data = requestBody();
        $email = strtolower(cleanText($data['email'] ?? '', 254));
        $password = is_string($data['password'] ?? null) ? $data['password'] : '';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) > 200) respond(401, ['error' => 'Correo o contraseña incorrectos.']);
        $limit = $pdo->prepare('SELECT COUNT(*) FROM login_attempts WHERE email=? AND attempted_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)');
        $limit->execute([$email]);
        if ((int)$limit->fetchColumn() >= 8) respond(429, ['error' => 'Demasiados intentos. Espera 15 minutos.']);
        $stmt = $pdo->prepare('SELECT id,name,email,role,password_hash,active FROM users WHERE email=? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        if (!$user || !(bool)$user['active'] || !password_verify($password, $user['password_hash'])) {
            $pdo->prepare('INSERT INTO login_attempts (email) VALUES (?)')->execute([$email]);
            respond(401, ['error' => 'Correo o contraseña incorrectos.']);
        }
        $pdo->prepare('DELETE FROM login_attempts WHERE email=?')->execute([$email]);
        session_regenerate_id(true);
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        unset($user['password_hash'], $user['active']);
        respond(200, ['user' => $user, 'csrf' => $_SESSION['csrf']]);
    }

    if ($route === 'logout' && $method === 'POST') {
        checkMutation();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', ['expires' => time()-42000,'path' => $params['path'],'domain' => $params['domain'],'secure' => $params['secure'],'httponly' => $params['httponly'],'samesite' => 'Strict']);
        }
        session_destroy();
        respond(200, ['ok' => true]);
    }

    $user = requireUser();
    if ($method !== 'GET') checkMutation();

    if ($route === 'data' && $method === 'GET') {
        $students = visibleStudents($user);
        $studentIds = array_column($students, 'id');
        $subjects = visibleSubjects($user, $studentIds);
        $subjectIds = array_column($subjects, 'id');
        $allCourses=courseRows();
        $courses=$user['role']==='admin'?$allCourses:array_values(array_filter($allCourses,function($c)use($user,$students){if($user['role']==='analista')return count(array_filter(analystAssignments($user['id']),fn($a)=>$a['courseId']===$c['id']))>0;return count(array_filter($students,fn($s)=>$s['courseId']===$c['id']))>0;}));
        $assignments=$user['role']==='analista'?analystAssignments($user['id']):[];
        $studentCourse=[];foreach($students as $student)$studentCourse[$student['id']]=$student['courseId'];
        $assignmentScope=[];foreach($assignments as $assignment)$assignmentScope[$assignment['courseId'].'|'.$assignment['subjectId']]=true;
        $plans = [];
        $progress = [];
        if ($subjectIds) {
            $mMarks = placeholders($subjectIds);
            $plans = fetchScoped("SELECT id,subject_id AS subjectId,title,guide,DATE_FORMAT(created_at,'%Y-%m-%dT%H:%i:%sZ') AS createdAt FROM plans WHERE subject_id IN ($mMarks) ORDER BY created_at DESC", $subjectIds);
            $planIds = array_column($plans, 'id');
            if ($planIds) {
                $topics = fetchScoped('SELECT id,plan_id AS planId,title FROM plan_topics WHERE plan_id IN (' . placeholders($planIds) . ') ORDER BY created_at,id', $planIds);
                unset($topic);
                foreach ($plans as &$planRow) $planRow['topics'] = array_values(array_filter($topics, fn($t) => $t['planId'] === $planRow['id']));
                unset($planRow);
            } else foreach ($plans as &$planRow) $planRow['topics'] = [];
        }
        $topicProgress=[];
        if($studentIds && $subjectIds){
            $topicProgress=fetchScoped('SELECT stp.student_id AS studentId,stp.topic_id AS topicId,stp.starting_point AS startingPoint,stp.research,stp.skill_development AS skillDevelopment,stp.relation,pt.plan_id AS planId,p.subject_id AS subjectId FROM student_topic_progress stp JOIN plan_topics pt ON pt.id=stp.topic_id JOIN plans p ON p.id=pt.plan_id WHERE stp.student_id IN ('.placeholders($studentIds).') AND p.subject_id IN ('.placeholders($subjectIds).')',[...$studentIds,...$subjectIds]);
            if($user['role']==='analista')$topicProgress=array_values(array_filter($topicProgress,fn($row)=>isset($assignmentScope[($studentCourse[$row['studentId']]??'').'|'.$row['subjectId']])));
            foreach($topicProgress as &$tp)foreach(['startingPoint','research','skillDevelopment','relation'] as $stage)$tp[$stage]=(bool)$tp[$stage];unset($tp);
        }
        if ($studentIds && $subjectIds) {
            $sMarks = placeholders($studentIds); $mMarks = placeholders($subjectIds);
            $progress = fetchScoped("SELECT id,student_id AS studentId,subject_id AS subjectId,plan_id AS planId,note,completed,observation,DATE_FORMAT(created_at,'%Y-%m-%dT%H:%i:%sZ') AS createdAt FROM progress WHERE student_id IN ($sMarks) AND subject_id IN ($mMarks) ORDER BY created_at DESC", [...$studentIds,...$subjectIds]);
            if($user['role']==='analista')$progress=array_values(array_filter($progress,fn($row)=>isset($assignmentScope[($studentCourse[$row['studentId']]??'').'|'.$row['subjectId']])));
        }
        foreach ($progress as &$row) $row['completed'] = (bool)$row['completed'];
        unset($row);
        $setting = $pdo->query('SELECT school_name AS schoolName,passing_score AS passingScore,term,theme FROM institution_settings WHERE id=1')->fetch() ?: [];
        $setting['passingScore'] = (int)($setting['passingScore'] ?? 60);
        $alerts = []; $checklistSummary=[];
        $topicCountBySubject=[];foreach($plans as $plan)foreach($plan['topics'] as $topic)$topicCountBySubject[$plan['subjectId']]=($topicCountBySubject[$plan['subjectId']]??0)+1;
        $completedByStudentSubject=[];foreach($topicProgress as $tp)foreach(['startingPoint','research','skillDevelopment','relation'] as $stage)if($tp[$stage]){$key=$tp['studentId'].'|'.$tp['subjectId'];$completedByStudentSubject[$key]=($completedByStudentSubject[$key]??0)+1;}
        foreach ($students as $student) foreach ($subjects as $subject) {
            if((int)$student['gradeLevel']!==(int)$subject['gradeLevel'])continue;
            if($user['role']==='analista'&&!isset($assignmentScope[$student['courseId'].'|'.$subject['id']]))continue;
            $total=($topicCountBySubject[$subject['id']]??0)*4;$done=$completedByStudentSubject[$student['id'].'|'.$subject['id']]??0;
            $percent=$total?(int)round($done/$total*100):0;$checklistSummary[]=['studentId'=>$student['id'],'subjectId'=>$subject['id'],'completed'=>$done,'total'=>$total,'percent'=>$percent];
            if ($total && $percent < $setting['passingScore']) $alerts[] = ['student' => $student['name'], 'subject' => $subject['name'], 'percent' => $percent];
        }
        unset($user['active']);
        respond(200, compact('user','students','subjects','plans','progress','courses','assignments','topicProgress','checklistSummary') + ['settings' => $setting, 'alerts' => $alerts]);
    }

    if ($route === 'courses' && $method === 'GET') respond(200,['courses'=>courseRows()]);
    if ($route === 'courses' && $method === 'POST') {
        requireUser(['admin']);$x=requestBody();$grade=(int)($x['gradeLevel']??0);$code=cleanText($x['courseCode']??'',40);
        if($grade<6||$grade>11||!preg_match('/^[\pL\pN -]{1,40}$/u',$code))respond(400,['error'=>'Indica un grado de 6.º a 11.º y un código de curso válido, por ejemplo 601.']);
        $id=uuid();try{$pdo->prepare('INSERT INTO courses (id,grade_level,course_code) VALUES (?,?,?)')->execute([$id,$grade,$code]);}catch(PDOException $e){if((string)$e->getCode()==='23000')respond(409,['error'=>'Ya existe ese curso para el grado seleccionado.']);throw $e;}
        respond(201,['item'=>['id'=>$id,'gradeLevel'=>$grade,'courseCode'=>$code,'label'=>"$grade° · $code"]]);
    }

    if ($route === 'students' && $method === 'POST') {
        requireUser(['admin','analista']);
        $x = requestBody(); $name = cleanText($x['name'] ?? '', 160); $courseId=cleanText($x['courseId']??'',36);
        $q=$pdo->prepare('SELECT id,grade_level,course_code FROM courses WHERE id=?');$q->execute([$courseId]);$course=$q->fetch();
        if(mb_strlen($name,'UTF-8')<3||!$course)respond(400,['error'=>'Indica nombre y selecciona un curso existente.']);
        if($user['role']==='analista'&&!analystAssignments($user['id']))respond(403,['error'=>'No tienes cursos asignados.']);
        if($user['role']==='analista'){$q=$pdo->prepare('SELECT 1 FROM analyst_course_subjects WHERE user_id=? AND course_id=?');$q->execute([$user['id'],$courseId]);if(!$q->fetchColumn())respond(403,['error'=>'No tienes asignado este curso.']);}
        $grade=(int)$course['grade_level'];$item = ['id'=>uuid(),'name'=>$name,'grade'=>"$grade° · ".$course['course_code'],'courseId'=>$courseId,'gradeLevel'=>$grade,'code'=>cleanText($x['code'] ?? '',40),'guardian'=>cleanText($x['guardian'] ?? '',160)];
        $pdo->beginTransaction();try{$pdo->prepare('INSERT INTO students (id,name,grade,course_id,code,guardian) VALUES (?,?,?,?,?,?)')->execute([$item['id'],$item['name'],$item['grade'],$courseId,$item['code'],$item['guardian']]);$pdo->prepare('INSERT INTO student_topic_progress (student_id,topic_id) SELECT ?,t.id FROM plan_topics t JOIN plans p ON p.id=t.plan_id JOIN subjects sb ON sb.id=p.subject_id WHERE sb.grade_level=?')->execute([$item['id'],$grade]);$pdo->commit();}catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
        respond(201, ['item'=>$item]);
    }
    if (preg_match('~^students/([0-9a-f-]{36})$~i',$route,$m) && $method === 'DELETE') {
        requireUser(['admin']); $pdo->prepare('DELETE FROM students WHERE id=?')->execute([$m[1]]); respond(200,['ok'=>true]);
    }
    if ($route === 'subjects' && $method === 'POST') {
        requireUser(['admin']); $x=requestBody(); $name=cleanText($x['name']??'',100);
        if (mb_strlen($name,'UTF-8') < 2) respond(400,['error'=>'Indica el nombre de la materia.']);
        $grade=(int)($x['gradeLevel']??0); if($grade<6||$grade>11)respond(400,['error'=>'Selecciona un grado entre 6.º y 11.º.']);
        $duplicate=$pdo->prepare('SELECT COUNT(*) FROM subjects WHERE LOWER(name)=LOWER(?) AND grade_level=?');$duplicate->execute([$name,$grade]);if((int)$duplicate->fetchColumn())respond(409,['error'=>'Ya existe esa asignatura para ese grado.']);
        $item=['id'=>uuid(),'name'=>$name,'gradeLevel'=>$grade,'teacher'=>null,'description'=>cleanText($x['description']??'',500)];
        $pdo->prepare('INSERT INTO subjects (id,name,grade_level,teacher,description) VALUES (?,?,?,NULL,?)')->execute([$item['id'],$item['name'],$grade,$item['description']]); respond(201,['item'=>$item]);
    }
    if (preg_match('~^subjects/([0-9a-f-]{36})$~i',$route,$m) && $method === 'DELETE') {
        requireUser(['admin']); $pdo->prepare('DELETE FROM subjects WHERE id=?')->execute([$m[1]]); respond(200,['ok'=>true]);
    }
    if ($route === 'plans' && $method === 'POST') {
        $actor=requireUser(['admin','analista']); $x=requestBody(); $subject=cleanText($x['subjectId']??'',36); $title=cleanText($x['title']??'',160); $guide=cleanText($x['guide']??'',1000);
        $check=$pdo->prepare('SELECT COUNT(*) FROM subjects WHERE id=?');$check->execute([$subject]);
        if ((int)$check->fetchColumn()!==1||mb_strlen($title,'UTF-8')<2) respond(400,['error'=>'Selecciona una asignatura e indica el título del plan.']);
        if($actor['role']==='analista'&&!analystCanManageSubject($actor['id'],$subject))respond(403,['error'=>'No tienes asignada esta materia en un curso de su grado.']);
        $exists=$pdo->prepare('SELECT COUNT(*) FROM plans WHERE subject_id=?');$exists->execute([$subject]);if((int)$exists->fetchColumn())respond(409,['error'=>'Esta asignatura ya tiene un plan de estudios. Agrega allí los temas.']);
        $item=['id'=>uuid(),'subjectId'=>$subject,'title'=>$title,'guide'=>$guide,'topics'=>[]];
        $pdo->prepare('INSERT INTO plans (id,subject_id,title,guide) VALUES (?,?,?,?)')->execute([$item['id'],$subject,$title,$guide]); respond(201,['item'=>$item]);
    }
    if (preg_match('~^plans/([0-9a-f-]{36})$~i',$route,$m) && $method === 'PUT') {
        $actor=requireUser(['admin','analista']);$x=requestBody();$q=$pdo->prepare('SELECT subject_id FROM plans WHERE id=?');$q->execute([$m[1]]);$subject=$q->fetchColumn();if(!$subject)respond(404,['error'=>'Plan no encontrado.']);
        if($actor['role']==='analista'&&!analystCanManageSubject($actor['id'],$subject))respond(403,['error'=>'No tienes asignada esta materia.']);
        $title=cleanText($x['title']??'',160);$guide=cleanText($x['guide']??'',1000);if(mb_strlen($title,'UTF-8')<2)respond(400,['error'=>'El título debe tener al menos 2 caracteres.']);$pdo->prepare('UPDATE plans SET title=?,guide=? WHERE id=?')->execute([$title,$guide,$m[1]]);respond(200,['ok'=>true]);
    }
    if (preg_match('~^plans/([0-9a-f-]{36})$~i',$route,$m) && $method === 'DELETE') {
        $actor=requireUser(['admin']); $stmt=$pdo->prepare('SELECT subject_id FROM plans WHERE id=?'); $stmt->execute([$m[1]]); $subject=$stmt->fetchColumn();
        if (!$subject) respond(404,['error'=>'Plan no encontrado.']);
        $pdo->prepare('DELETE FROM plans WHERE id=?')->execute([$m[1]]); respond(200,['ok'=>true]);
    }
    if (preg_match('~^plans/([0-9a-f-]{36})/topics$~i',$route,$m) && $method === 'POST') {
        $actor=requireUser(['admin','analista']);$x=requestBody();$title=cleanText($x['title']??'',160);$stmt=$pdo->prepare('SELECT subject_id FROM plans WHERE id=?');$stmt->execute([$m[1]]);$subject=$stmt->fetchColumn();if(!$subject)respond(404,['error'=>'Plan no encontrado.']);
        if($actor['role']==='analista'&&!analystCanManageSubject($actor['id'],$subject))respond(403,['error'=>'No tienes asignada esta materia.']);
        if(mb_strlen($title,'UTF-8')<2)respond(400,['error'=>'Escribe el nombre del tema.']);$id=uuid();$pdo->beginTransaction();try{$pdo->prepare('INSERT INTO plan_topics (id,plan_id,title) VALUES (?,?,?)')->execute([$id,$m[1],$title]);$grade=$pdo->prepare('SELECT grade_level FROM subjects WHERE id=?');$grade->execute([$subject]);$pdo->prepare('INSERT INTO student_topic_progress (student_id,topic_id) SELECT s.id,? FROM students s JOIN courses c ON c.id=s.course_id WHERE c.grade_level=?')->execute([$id,(int)$grade->fetchColumn()]);$pdo->commit();}catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}respond(201,['topic'=>['id'=>$id,'planId'=>$m[1],'title'=>$title]]);
    }
    if (preg_match('~^topics/([0-9a-f-]{36})$~i',$route,$m) && $method === 'PUT') {
        $actor=requireUser(['admin','analista']);$x=requestBody();$title=cleanText($x['title']??'',160);if(mb_strlen($title,'UTF-8')<2)respond(400,['error'=>'El nombre del tema debe tener al menos 2 caracteres.']);$q=$pdo->prepare('SELECT p.subject_id FROM plan_topics t JOIN plans p ON p.id=t.plan_id WHERE t.id=?');$q->execute([$m[1]]);$subject=$q->fetchColumn();if(!$subject)respond(404,['error'=>'Tema no encontrado.']);if($actor['role']==='analista'&&!analystCanManageSubject($actor['id'],$subject))respond(403,['error'=>'No tienes asignada esta materia.']);$pdo->prepare('UPDATE plan_topics SET title=? WHERE id=?')->execute([$title,$m[1]]);respond(200,['ok'=>true]);
    }
    if (preg_match('~^students/([0-9a-f-]{36})/topics/([0-9a-f-]{36})$~i',$route,$m) && $method === 'PUT') {
        $actor=requireUser(['admin','analista']);$x=requestBody();$fields=['startingPoint'=>'starting_point','research'=>'research','skillDevelopment'=>'skill_development','relation'=>'relation'];$stage=$x['stage']??'';$completed=$x['completed']??null;if(!isset($fields[$stage])||!is_bool($completed))respond(400,['error'=>'Etapa no válida.']);
        $q=$pdo->prepare('SELECT s.course_id,p.subject_id,c.grade_level,sb.grade_level AS subject_grade FROM students s JOIN courses c ON c.id=s.course_id JOIN plan_topics t ON t.id=? JOIN plans p ON p.id=t.plan_id JOIN subjects sb ON sb.id=p.subject_id WHERE s.id=?');$q->execute([$m[2],$m[1]]);$scope=$q->fetch();if(!$scope)respond(404,['error'=>'Estudiante o tema no encontrado.']);if((int)$scope['grade_level']!==(int)$scope['subject_grade'])respond(400,['error'=>'El tema no pertenece al grado del estudiante.']);
        if($actor['role']==='analista'&&!analystCanManage($actor['id'],$scope['course_id'],$scope['subject_id']))respond(403,['error'=>'No tienes asignados este curso y asignatura.']);
        $sql='INSERT INTO student_topic_progress (student_id,topic_id,'.$fields[$stage].',updated_by) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE '.$fields[$stage].'=VALUES('.$fields[$stage].'),updated_by=VALUES(updated_by)';$pdo->prepare($sql)->execute([$m[1],$m[2],$completed?1:0,$actor['id']]);respond(200,['ok'=>true]);
    }
    if ($route === 'progress' && $method === 'POST') {
        $actor=requireUser(['admin','analista']); $x=requestBody(); $student=cleanText($x['studentId']??'',36); $subject=cleanText($x['subjectId']??'',36); $note=cleanText($x['note']??'',1000); $plan=cleanText($x['planId']??'',36); $completed=($x['completed']??false)===true;
        if ($note==='') respond(400,['error'=>'Estudiante, materia y descripción son obligatorios.']);
        $check=$pdo->prepare('SELECT COUNT(*) FROM students WHERE id=?'); $check->execute([$student]); $hasStudent=(int)$check->fetchColumn()===1; $check=$pdo->prepare('SELECT COUNT(*) FROM subjects WHERE id=?'); $check->execute([$subject]); $hasSubject=(int)$check->fetchColumn()===1;
        if (!$hasStudent||!$hasSubject) respond(400,['error'=>'Selecciona un estudiante y una materia válidos.']);
        $gradeCheck=$pdo->prepare('SELECT s.course_id,c.grade_level,sb.grade_level AS subject_grade FROM students s JOIN courses c ON c.id=s.course_id JOIN subjects sb ON sb.id=? WHERE s.id=?');$gradeCheck->execute([$subject,$student]);$gradeRow=$gradeCheck->fetch();
        if (!$gradeRow||(int)$gradeRow['grade_level']!==(int)$gradeRow['subject_grade']) respond(400,['error'=>'La materia debe corresponder al grado del estudiante.']);
        if ($actor['role']==='analista' && !analystCanManage($actor['id'],(string)$gradeRow['course_id'],$subject)) respond(403,['error'=>'No tienes asignados este curso y asignatura.']);
        $planId=null;
        if ($plan!=='') { $check=$pdo->prepare('SELECT COUNT(*) FROM plans WHERE id=? AND subject_id=?'); $check->execute([$plan,$subject]); if ((int)$check->fetchColumn()!==1) respond(400,['error'=>'El plan debe corresponder a la misma asignatura del avance.']); $planId=$plan; }
        $item=['id'=>uuid(),'studentId'=>$student,'subjectId'=>$subject,'planId'=>$planId??'','note'=>$note,'completed'=>$completed,'observation'=>cleanText($x['observation']??'',1000),'createdAt'=>gmdate('Y-m-d\TH:i:s\Z')];
        $pdo->prepare('INSERT INTO progress (id,student_id,subject_id,plan_id,note,completed,observation,created_by) VALUES (?,?,?,?,?,?,?,?)')->execute([$item['id'],$student,$subject,$planId,$note,$completed?1:0,$item['observation'],$actor['id']]); respond(201,['item'=>$item]);
    }
    if (preg_match('~^progress/([0-9a-f-]{36})$~i',$route,$m) && $method === 'DELETE') {
        $actor=requireUser(['admin','analista']); $stmt=$pdo->prepare('SELECT p.subject_id,s.course_id FROM progress p JOIN students s ON s.id=p.student_id WHERE p.id=?'); $stmt->execute([$m[1]]); $row=$stmt->fetch();
        if (!$row) respond(404,['error'=>'Registro no encontrado.']);
        if ($actor['role']==='analista' && !analystCanManage($actor['id'],$row['course_id'],$row['subject_id'])) respond(403,['error'=>'No tienes asignados este curso y asignatura.']);
        $pdo->prepare('DELETE FROM progress WHERE id=?')->execute([$m[1]]); respond(200,['ok'=>true]);
    }
    if ($route === 'settings' && $method === 'PUT') {
        requireUser(['admin']); $x=requestBody(); $score=filter_var($x['passingScore']??null,FILTER_VALIDATE_INT);
        if ($score===false||$score<0||$score>100) respond(400,['error'=>'El umbral de alerta debe estar entre 0 y 100.']);
        $settings=['schoolName'=>cleanText($x['schoolName']??'',120),'passingScore'=>$score,'term'=>cleanText($x['term']??'',80),'theme'=>($x['theme']??'')==='dark'?'dark':'light'];
        if ($settings['schoolName']===''||$settings['term']==='') respond(400,['error'=>'El nombre institucional y el periodo son obligatorios.']);
        $pdo->prepare('UPDATE institution_settings SET school_name=?,passing_score=?,term=?,theme=? WHERE id=1')->execute([$settings['schoolName'],$score,$settings['term'],$settings['theme']]); respond(200,['settings'=>$settings]);
    }
    if ($route === 'users' && $method === 'GET') {
        requireUser(['admin']); $users=$pdo->query('SELECT id,name,email,role,active FROM users ORDER BY name')->fetchAll();
        foreach ($users as &$account) {
            $account['active']=(bool)$account['active'];
            $account['studentIds']=idsFor('family_students','student_id',$account['id']);
            $account['assignments']=analystAssignments($account['id']);
        }
        unset($account);
        $students=fetchScoped('SELECT s.id,s.name,s.grade,s.course_id AS courseId,c.grade_level AS gradeLevel,c.course_code AS courseCode,s.code,s.guardian FROM students s JOIN courses c ON c.id=s.course_id ORDER BY s.name',[]); $subjects=subjectRows(); foreach($subjects as &$subjectRow)$subjectRow['gradeLevel']=(int)$subjectRow['gradeLevel'];unset($subjectRow);$courses=courseRows();respond(200,compact('users','students','subjects','courses'));
    }
    if ($route === 'users' && $method === 'POST') {
        requireUser(['admin']); $x=requestBody(); $name=cleanText($x['name']??'',120); $email=strtolower(cleanText($x['email']??'',254)); $password=is_string($x['password']??null)?$x['password']:''; $role=cleanText($x['role']??'',20);
        if (mb_strlen($name,'UTF-8')<3||!filter_var($email,FILTER_VALIDATE_EMAIL)||strlen($password)<12||strlen($password)>200||(!in_array('argon2id',password_algos(),true)&&strlen($password)>72)||!in_array($role,['admin','analista','familia'],true)) respond(400,['error'=>'Verifica nombre, correo, rol y contraseña válida de mínimo 12 caracteres.']);
        $familyIds=is_array($x['studentIds']??null)?array_values(array_unique(array_filter($x['studentIds'],'is_string'))):[]; $assignments=is_array($x['assignments']??null)?$x['assignments']:[];
        if ($role==='familia'&&!$familyIds) respond(400,['error'=>'Asigna al menos un estudiante a la cuenta familiar.']);
        if ($role==='analista'&&!$assignments) respond(400,['error'=>'Asigna al menos un curso y una asignatura al analista.']);
        if($role==='analista')foreach($assignments as $a){if(!is_array($a)||empty($a['courseId'])||empty($a['subjectId']))respond(400,['error'=>'Cada asignación debe incluir curso y asignatura.']);$q=$pdo->prepare('SELECT 1 FROM courses c JOIN subjects s ON s.id=? AND s.grade_level=c.grade_level WHERE c.id=?');$q->execute([$a['subjectId'],$a['courseId']]);if(!$q->fetchColumn())respond(400,['error'=>'La asignatura y el curso deben ser del mismo grado.']);}
        $id=uuid(); $passwordHash=hashPassword($password);
        try {
            $pdo->beginTransaction();
            $pdo->prepare('INSERT INTO users (id,name,email,role,password_hash) VALUES (?,?,?,?,?)')->execute([$id,$name,$email,$role,$passwordHash]);
            $familyInsert=$pdo->prepare('INSERT IGNORE INTO family_students (user_id,student_id) SELECT ?,id FROM students WHERE id=?'); foreach($familyIds as $sid)$familyInsert->execute([$id,$sid]);
            $assignmentInsert=$pdo->prepare('INSERT IGNORE INTO analyst_course_subjects (user_id,course_id,subject_id) VALUES (?,?,?)');foreach($assignments as $a)$assignmentInsert->execute([$id,$a['courseId'],$a['subjectId']]);
            $subjectIds=array_values(array_unique(array_column($assignments,'subjectId')));$subjectInsert=$pdo->prepare('INSERT IGNORE INTO analyst_subjects (user_id,subject_id) VALUES (?,?)');foreach($subjectIds as $sid)$subjectInsert->execute([$id,$sid]);
            $pdo->commit();
        } catch (PDOException $e) { if($pdo->inTransaction())$pdo->rollBack(); if((string)$e->getCode()==='23000')respond(400,['error'=>'Ese correo ya está registrado o una asignación no es válida.']); throw $e; }
        respond(201,['user'=>['id'=>$id,'name'=>$name,'email'=>$email,'role'=>$role,'studentIds'=>$familyIds,'assignments'=>$assignments,'active'=>true]]);
    }
    if (preg_match('~^users/([0-9a-f-]{36})/assignments$~i',$route,$m) && $method === 'PUT') {
        requireUser(['admin']);$x=requestBody();$assignments=is_array($x['assignments']??null)?$x['assignments']:[];if(!$assignments)respond(400,['error'=>'Asigna al menos un curso y una asignatura.']);$q=$pdo->prepare("SELECT id FROM users WHERE id=? AND role='analista'");$q->execute([$m[1]]);if(!$q->fetchColumn())respond(404,['error'=>'No se encontró la cuenta de analista.']);
        $seen=[];foreach($assignments as $a){if(!is_array($a)||empty($a['courseId'])||empty($a['subjectId']))respond(400,['error'=>'Asignación incompleta.']);$key=$a['courseId'].'|'.$a['subjectId'];if(isset($seen[$key]))continue;$seen[$key]=1;$q=$pdo->prepare('SELECT 1 FROM courses c JOIN subjects s ON s.id=? AND s.grade_level=c.grade_level WHERE c.id=?');$q->execute([$a['subjectId'],$a['courseId']]);if(!$q->fetchColumn())respond(400,['error'=>'La asignatura no corresponde al grado del curso.']);}
        $assignments=array_values(array_filter($assignments,function($a)use(&$seen){static $done=[];$key=$a['courseId'].'|'.$a['subjectId'];if(isset($done[$key]))return false;$done[$key]=true;return true;}));
        $pdo->beginTransaction();try{$pdo->prepare('DELETE FROM analyst_course_subjects WHERE user_id=?')->execute([$m[1]]);$pdo->prepare('DELETE FROM analyst_subjects WHERE user_id=?')->execute([$m[1]]);$ins=$pdo->prepare('INSERT INTO analyst_course_subjects (user_id,course_id,subject_id) VALUES (?,?,?)');$legacy=$pdo->prepare('INSERT IGNORE INTO analyst_subjects (user_id,subject_id) VALUES (?,?)');foreach($assignments as $a){$ins->execute([$m[1],$a['courseId'],$a['subjectId']]);$legacy->execute([$m[1],$a['subjectId']]);}$pdo->commit();}catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}respond(200,['ok'=>true,'assignments'=>$assignments]);
    }
    if (preg_match('~^users/([0-9a-f-]{36})/students$~i',$route,$m) && $method === 'PUT') {
        requireUser(['admin']);$x=requestBody();$studentIds=is_array($x['studentIds']??null)?array_values(array_unique(array_filter($x['studentIds'],'is_string'))):[];if(!$studentIds)respond(400,['error'=>'Vincula al menos un estudiante a la familia.']);$q=$pdo->prepare("SELECT id FROM users WHERE id=? AND role='familia'");$q->execute([$m[1]]);if(!$q->fetchColumn())respond(404,['error'=>'No se encontró la cuenta familiar.']);$valid=fetchScoped('SELECT id FROM students WHERE id IN ('.placeholders($studentIds).')',$studentIds);if(count($valid)!==count($studentIds))respond(400,['error'=>'Hay un estudiante inválido.']);$pdo->beginTransaction();try{$pdo->prepare('DELETE FROM family_students WHERE user_id=?')->execute([$m[1]]);$ins=$pdo->prepare('INSERT INTO family_students (user_id,student_id) VALUES (?,?)');foreach($studentIds as $sid)$ins->execute([$m[1],$sid]);$pdo->commit();}catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}respond(200,['ok'=>true,'studentIds'=>$studentIds]);
    }
    if (preg_match('~^users/([0-9a-f-]{36})/subjects$~i',$route,$m) && $method === 'PUT') {
        requireUser(['admin']);$x=requestBody();$subjectIds=is_array($x['subjectIds']??null)?array_values(array_unique(array_filter($x['subjectIds'],'is_string'))):[];
        if(!$subjectIds)respond(400,['error'=>'Asigna al menos una asignatura al analista.']);
        $account=$pdo->prepare("SELECT id FROM users WHERE id=? AND role='analista'");$account->execute([$m[1]]);if(!$account->fetchColumn())respond(404,['error'=>'No se encontró la cuenta de analista.']);
        $valid=fetchScoped('SELECT id FROM subjects WHERE id IN (' . placeholders($subjectIds) . ')',$subjectIds);if(count($valid)!==count($subjectIds))respond(400,['error'=>'Hay una asignatura inválida.']);
        try{$pdo->beginTransaction();$pdo->prepare('DELETE FROM analyst_subjects WHERE user_id=?')->execute([$m[1]]);$insert=$pdo->prepare('INSERT INTO analyst_subjects (user_id,subject_id) VALUES (?,?)');foreach($subjectIds as $subjectId)$insert->execute([$m[1],$subjectId]);$pdo->commit();}
        catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
        respond(200,['ok'=>true,'subjectIds'=>$subjectIds]);
    }
    if (preg_match('~^users/([0-9a-f-]{36})$~i',$route,$m) && $method === 'DELETE') {
        $actor=requireUser(['admin']); if($m[1]===$actor['id'])respond(400,['error'=>'No puedes desactivar tu propia cuenta.']);
        $stmt=$pdo->prepare('UPDATE users SET active=0 WHERE id=?');$stmt->execute([$m[1]]);if(!$stmt->rowCount())respond(404,['error'=>'Cuenta no encontrada.']);respond(200,['ok'=>true]);
    }
    respond(404,['error'=>'Ruta no encontrada.']);
} catch (Throwable $e) {
    error_log('SERMA API: ' . $e->getMessage());
    respond(500,['error'=>'No fue posible completar la solicitud. Verifica la conexión con MySQL.']);
}
