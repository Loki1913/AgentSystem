<?php
declare(strict_types=1);
namespace AgentSystem\Tools;

final class WorkspaceTool
{
    private string $root;
    public function __construct(?string $root = null)
    {
        $this->root = $root ?? dirname(__DIR__, 2) . '/workspace';
        if (!is_dir($this->root) && !mkdir($this->root, 0770, true) && !is_dir($this->root)) {
            throw new \RuntimeException('No se pudo preparar workspace.');
        }
        $real = realpath($this->root);
        if ($real === false) throw new \RuntimeException('Workspace inválido.');
        $this->root = $real;
    }

    public function listFiles(): array
    {
        $items = [];
        $iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($this->root, \FilesystemIterator::SKIP_DOTS));
        foreach ($iterator as $file) {
            if ($file->isFile() && !$file->isLink()) {
                $items[] = str_replace(DIRECTORY_SEPARATOR, '/', substr($file->getPathname(), strlen($this->root) + 1));
                if (count($items) >= 500) break;
            }
        }
        sort($items);
        return $items;
    }

    public function read(string $path): array
    {
        $target = $this->resolve($path, false);
        if (!is_file($target) || is_link($target)) throw new \RuntimeException('No es un archivo regular del workspace.');
        if (filesize($target) > 200_000) throw new \RuntimeException('Archivo demasiado grande (máximo 200 KB).');
        return ['path' => $path, 'content' => (string) file_get_contents($target)];
    }

    public function write(string $path, string $content): array
    {
        if (strlen($content) > 200_000) throw new \RuntimeException('Contenido demasiado grande (máximo 200 KB).');
        $target = $this->resolve($path, true);
        $directory = dirname($target);
        if (!is_dir($directory) && !mkdir($directory, 0770, true) && !is_dir($directory)) throw new \RuntimeException('No se pudo crear la carpeta.');
        if (is_link($target)) throw new \RuntimeException('No se permiten enlaces simbólicos.');
        $old = is_file($target) ? (string) file_get_contents($target) : '';
        if (file_put_contents($target, $content, LOCK_EX) === false) throw new \RuntimeException('No se pudo guardar el archivo.');
        return ['path' => $path, 'created' => $old === '', 'bytes' => strlen($content), 'previous_content' => mb_substr($old, 0, 20000)];
    }

    private function resolve(string $path, bool $allowNew): string
    {
        $path = str_replace('\\', '/', trim($path));
        if ($path === '' || str_contains($path, "\0") || str_starts_with($path, '/') || preg_match('/^[A-Za-z]:/', $path)) throw new \InvalidArgumentException('Ruta inválida.');
        $parts = explode('/', $path);
        foreach ($parts as $part) if ($part === '' || $part === '.' || $part === '..') throw new \InvalidArgumentException('La ruta no puede salir del workspace.');
        $target = $this->root . DIRECTORY_SEPARATOR . implode(DIRECTORY_SEPARATOR, $parts);
        $parent = dirname($target);
        $realParent = realpath($parent);
        if ($realParent !== false && !str_starts_with($realParent . DIRECTORY_SEPARATOR, $this->root . DIRECTORY_SEPARATOR) && $realParent !== $this->root) throw new \RuntimeException('Ruta fuera del workspace.');
        if (!$allowNew && !file_exists($target)) throw new \RuntimeException('El archivo no existe.');
        return $target;
    }
}
