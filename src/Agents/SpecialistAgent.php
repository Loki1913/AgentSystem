<?php
declare(strict_types=1);
namespace AgentSystem\Agents;

use AgentSystem\ModelGateway;
use NeuronAI\Agent\Agent;
use NeuronAI\Chat\Messages\UserMessage;

final class SpecialistAgent
{
    public function __construct(private readonly ModelGateway $gateway) {}

    public function run(string $task, string $instructions, ?string $model = null): array
    {
        $agent = Agent::make()
            ->setAiProvider($this->gateway->provider($model))
            ->setInstructions($instructions)
            ->setThreadId(bin2hex(random_bytes(12)));
        $state = $agent->chat(new UserMessage($task));
        $message = $state->getMessage();
        if ($message === null) throw new \RuntimeException('El agente no devolvió un mensaje final.');
        return [
            'answer' => $message->getContent(),
            'agent' => 'neuron-specialist',
            'model' => $this->gateway->provider($model)->getModel(),
        ];
    }
}
