/**
 * Configuration Test Component
 * 
 * This component demonstrates and tests the Tailwind CSS and shadcn/ui configuration
 * including theme colors, responsive breakpoints, and component functionality.
 * 
 * Task 1.2: Configure Tailwind CSS and shadcn/ui
 */

import { Button } from './button';
import { Card } from './card';
import { Input } from './input';
import { Label } from './label';
import { Select } from './select';
import { Alert } from './alert';

export function ConfigurationTest() {
  return (
    <div className="min-h-screen bg-background p-4 mobile:p-2 tablet:p-6 desktop:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            Papa Bolotas - Teste de Configuração
          </h1>
          <p className="text-muted-foreground">
            Verificação da configuração de Tailwind CSS e shadcn/ui
          </p>
        </div>

        {/* Responsive Breakpoints Test */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Pontos de Quebra Responsivos</h2>
          <div className="space-y-2">
            <div className="mobile:bg-red-100 tablet:bg-blue-100 desktop:bg-green-100 p-4 rounded">
              <p className="font-medium">
                <span className="mobile:inline tablet:hidden desktop:hidden">
                  Telemóvel: 320px+ (Fundo vermelho)
                </span>
                <span className="mobile:hidden tablet:inline desktop:hidden">
                  Tablet: 768px+ (Fundo azul)
                </span>
                <span className="mobile:hidden tablet:hidden desktop:inline">
                  Computador: 1025px+ (Fundo verde)
                </span>
              </p>
            </div>
          </div>
        </Card>

        {/* Brand Colors Test */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Cores da Marca Papa Bolotas</h2>
          <div className="grid grid-cols-1 tablet:grid-cols-3 desktop:grid-cols-5 gap-4">
            <div className="space-y-2">
              <div className="bg-brand-primary h-20 rounded-lg" />
              <p className="text-sm font-medium">Primária</p>
              <p className="text-xs text-muted-foreground">#FF6B35</p>
            </div>
            <div className="space-y-2">
              <div className="bg-brand-secondary h-20 rounded-lg" />
              <p className="text-sm font-medium">Secundária</p>
              <p className="text-xs text-muted-foreground">#004E89</p>
            </div>
            <div className="space-y-2">
              <div className="bg-brand-accent h-20 rounded-lg" />
              <p className="text-sm font-medium">Destaque</p>
              <p className="text-xs text-muted-foreground">#F7931E</p>
            </div>
            <div className="space-y-2">
              <div className="bg-brand-dark h-20 rounded-lg border" />
              <p className="text-sm font-medium">Escura</p>
              <p className="text-xs text-muted-foreground">#1A1A1A</p>
            </div>
            <div className="space-y-2">
              <div className="bg-brand-light h-20 rounded-lg border" />
              <p className="text-sm font-medium">Clara</p>
              <p className="text-xs text-muted-foreground">#F5F5F5</p>
            </div>
          </div>
        </Card>

        {/* shadcn/ui Theme Colors Test */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Cores do Tema shadcn/ui</h2>
          <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="bg-primary h-16 rounded-lg" />
              <p className="text-sm font-medium">Primária</p>
            </div>
            <div className="space-y-2">
              <div className="bg-secondary h-16 rounded-lg" />
              <p className="text-sm font-medium">Secundária</p>
            </div>
            <div className="space-y-2">
              <div className="bg-accent h-16 rounded-lg" />
              <p className="text-sm font-medium">Destaque</p>
            </div>
            <div className="space-y-2">
              <div className="bg-destructive h-16 rounded-lg" />
              <p className="text-sm font-medium">Destrutiva</p>
            </div>
          </div>
        </Card>

        {/* Button Variants Test */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Componentes de Botão</h2>
          <div className="flex flex-wrap gap-4">
            <Button variant="default">Predefinido</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="destructive">Destrutivo</Button>
            <Button variant="outline">Contorno</Button>
            <Button variant="ghost">Fantasma</Button>
            <Button variant="link">Ligação</Button>
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            <Button size="sm">Pequeno</Button>
            <Button size="default">Predefinido</Button>
            <Button size="lg">Grande</Button>
          </div>
        </Card>

        {/* Form Components Test */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Componentes de Formulário</h2>
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="test-input">Campo de Texto</Label>
              <Input id="test-input" placeholder="Introduza texto..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-select">Campo de Seleção</Label>
              <Select>
                <option>Opção 1</option>
                <option>Opção 2</option>
                <option>Opção 3</option>
              </Select>
            </div>
          </div>
        </Card>

        {/* Alert Component Test */}
        <Alert>
          <h4 className="font-semibold">Configuração Concluída!</h4>
          <p className="text-sm">
            Tailwind CSS e shadcn/ui estão corretamente configurados com a marca Papa Bolotas.
          </p>
        </Alert>

        {/* Touch Target Test (Mobile) */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Áreas de Toque (mín. 44x44px)</h2>
          <div className="flex flex-wrap gap-4">
            <Button size="icon" className="min-h-[44px] min-w-[44px]">
              ✓
            </Button>
            <Button size="icon" className="min-h-[44px] min-w-[44px]">
              ✗
            </Button>
            <Button size="icon" className="min-h-[44px] min-w-[44px]">
              +
            </Button>
            <Button size="icon" className="min-h-[44px] min-w-[44px]">
              −
            </Button>
          </div>
        </Card>

        {/* Responsive Typography Test */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Tipografia Responsiva</h2>
          <div className="space-y-2">
            <h1 className="text-4xl mobile:text-2xl tablet:text-3xl desktop:text-4xl font-bold">
              Título 1 (Responsivo)
            </h1>
            <h2 className="text-3xl mobile:text-xl tablet:text-2xl desktop:text-3xl font-semibold">
              Título 2 (Responsivo)
            </h2>
            <p className="text-base mobile:text-sm tablet:text-base">
              Texto de corpo que se ajusta adequadamente a todos os dispositivos.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
