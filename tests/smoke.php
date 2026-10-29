<?php
declare(strict_types=1);
require dirname(__DIR__) . '/vendor/autoload.php';

use AgentSystem\Tools\TaskLog;
use AgentSystem\Tools\WorkspaceTool;

function check(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException('FAIL: ' . $message);
    echo "PASS: {$message}\n";
}

$base = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'agentsystem-smoke-' . bin2hex(random_bytes(4));
mkdir($base, 0770, true);
try {
    $workspace = new WorkspaceTool($base . '/workspace');
    $written = $workspace->write('src/demo.txt', 'hello workspace');
    check($written['bytes'] === 15, 'workspace writes within isolated root');
    check($workspace->read('src/demo.txt')['content'] === 'hello workspace', 'workspace reads written content');
    check(in_array('src/demo.txt', $workspace->listFiles(), true), 'workspace lists files');

    $blocked = false;
    try { $workspace->write('../escape.txt', 'no'); } catch (InvalidArgumentException $e) { $blocked = true; }
    check($blocked, 'workspace rejects path traversal');

    $log = new TaskLog($base . '/storage/tasks.jsonl');
    $log->record('coding', 'success', 'test-model', ['workspace_write'], 123);
    $recent = $log->recent(5);
    check(count($recent) === 1 && $recent[0]['mode'] === 'coding', 'task log records metadata');
    check(!array_key_exists('prompt', $recent[0]) && !array_key_exists('response', $recent[0]), 'task log excludes prompts and responses');
} finally {
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($base, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
    foreach ($iterator as $item) $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
    rmdir($base);
}
echo "All smoke tests passed.\n";
