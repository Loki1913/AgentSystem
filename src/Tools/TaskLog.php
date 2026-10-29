<?php
declare(strict_types=1);
namespace AgentSystem\Tools;

final class TaskLog
{
    private string $path;
    public function __construct(?string $path = null)
    {
        $this->path = $path ?? dirname(__DIR__, 2) . '/storage/tasks.jsonl';
    }

    public function record(string $mode, string $status, string $model = '', array $tools = [], int $durationMs = 0): void
    {
        $directory = dirname($this->path);
        if (!is_dir($directory) && !mkdir($directory, 0770, true) && !is_dir($directory)) return;
        $entry = [
            'id' => bin2hex(random_bytes(8)),
            'at' => gmdate(DATE_ATOM),
            'mode' => mb_substr($mode, 0, 30),
            'status' => mb_substr($status, 0, 20),
            'model' => mb_substr($model, 0, 120),
            'tools' => array_values(array_slice(array_map(static fn ($x) => mb_substr((string) $x, 0, 50), $tools), 0, 20)),
            'duration_ms' => max(0, $durationMs),
        ];
        // Intentionally do not persist prompts, images, provider keys, or model responses.
        file_put_contents($this->path, json_encode($entry, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL, FILE_APPEND | LOCK_EX);
    }

    public function recent(int $limit = 30): array
    {
        if (!is_file($this->path)) return [];
        $lines = file($this->path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        $items = [];
        foreach (array_slice($lines, -max(1, min(100, $limit))) as $line) {
            $decoded = json_decode($line, true);
            if (is_array($decoded)) $items[] = $decoded;
        }
        return array_reverse($items);
    }

    public function clear(): void
    {
        if (is_file($this->path)) file_put_contents($this->path, '', LOCK_EX);
    }
}
