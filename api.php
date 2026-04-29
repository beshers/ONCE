<?php
/**
 * WEB IDE CODE EDITOR API
 * RESTful JSON API Endpoints
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// Get request method and endpoint
$method = $_SERVER['REQUEST_METHOD'];
$request = $_GET['api'] ?? 'status';

// Simple routing
switch ($request) {
    case 'status':
        echo json_encode([
            'success' => true,
            'message' => 'WEB IDE CODE EDITOR API is running',
            'version' => '1.0.0',
            'timestamp' => date('c'),
            'php_version' => phpversion()
        ]);
        break;
        
    case 'code/generate':
        if ($method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            echo json_encode([
                'success' => true,
                'generated_code' => '// Generated code placeholder',
                'language' => $input['language'] ?? 'csharp'
            ]);
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        break;
        
    case 'code/repair':
        if ($method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            echo json_encode([
                'success' => true,
                'repaired_code' => $input['code'] ?? '',
                'fixes' => []
            ]);
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        break;
        
    case 'chat/send':
        if ($method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            echo json_encode([
                'success' => true,
                'response' => 'Echo: ' . ($input['message'] ?? ''),
                'timestamp' => date('c')
            ]);
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        break;
        
    default:
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'Endpoint not found',
            'available_endpoints' => [
                'status',
                'code/generate',
                'code/repair',
                'chat/send'
            ]
        ]);
}