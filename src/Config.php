<?php
declare(strict_types=1);
namespace AgentSystem;

final class Config
{
    public static function get(string $key, string $default = ''): string
    {
        $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
        return is_string($value) && $value !== '' ? $value : $default;
    }

    public static function requireValue(string $key): string
    {
        $value = self::get($key);
        if ($value === '') {
            throw new RuntimeException("Configuración requerida ausente: {$key}");
        }
        return $value;
    }

    public static function int(string $key, int $default, int $min, int $max): int
    {
        $value = filter_var(self::get($key, (string) $default), FILTER_VALIDATE_INT);
        return is_int($value) ? max($min, min($max, $value)) : $default;
    }
}
