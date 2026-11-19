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
            Papa Bolotas - Configuration Test
          </h1>
          <p className="text-muted-foreground">
            Tailwind CSS & shadcn/ui configuration verification
          </p>
        </div>

        {/* Responsive Breakpoints Test */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Responsive Breakpoints</h2>
          <div className="space-y-2">
            <div className="mobile:bg-red-100 tablet:bg-blue-100 desktop:bg-green-100 p-4 rounded">
              <p className="font-medium">
                <span className="mobile:inline tablet:hidden desktop:hidden">
                  Mobile: 320px+ (Red background)
                </span>
                <span className="mobile:hidden tablet:inline desktop:hidden">
                  Tablet: 768px+ (Blue background)
                </span>
                <span className="mobile:hidden tablet:hidden desktop:inline">
                  Desktop: 1025px+ (Green background)
                </span>
              </p>
            </div>
          </div>
        </Card>

        {/* Brand Colors Test */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Papa Bolotas Brand Colors</h2>
          <div className="grid grid-cols-1 tablet:grid-cols-3 desktop:grid-cols-5 gap-4">
            <div className="space-y-2">
              <div className="bg-brand-primary h-20 rounded-lg" />
              <p className="text-sm font-medium">Primary</p>
              <p className="text-xs text-muted-foreground">#FF6B35</p>
            </div>
            <div className="space-y-2">
              <div className="bg-brand-secondary h-20 rounded-lg" />
              <p className="text-sm font-medium">Secondary</p>
              <p className="text-xs text-muted-foreground">#004E89</p>
            </div>
            <div className="space-y-2">
              <div className="bg-brand-accent h-20 rounded-lg" />
              <p className="text-sm font-medium">Accent</p>
              <p className="text-xs text-muted-foreground">#F7931E</p>
            </div>
            <div className="space-y-2">
              <div className="bg-brand-dark h-20 rounded-lg border" />
              <p className="text-sm font-medium">Dark</p>
              <p className="text-xs text-muted-foreground">#1A1A1A</p>
            </div>
            <div className="space-y-2">
              <div className="bg-brand-light h-20 rounded-lg border" />
              <p className="text-sm font-medium">Light</p>
              <p className="text-xs text-muted-foreground">#F5F5F5</p>
            </div>
          </div>
        </Card>

        {/* shadcn/ui Theme Colors Test */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">shadcn/ui Theme Colors</h2>
          <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="bg-primary h-16 rounded-lg" />
              <p className="text-sm font-medium">Primary</p>
            </div>
            <div className="space-y-2">
              <div className="bg-secondary h-16 rounded-lg" />
              <p className="text-sm font-medium">Secondary</p>
            </div>
            <div className="space-y-2">
              <div className="bg-accent h-16 rounded-lg" />
              <p className="text-sm font-medium">Accent</p>
            </div>
            <div className="space-y-2">
              <div className="bg-destructive h-16 rounded-lg" />
              <p className="text-sm font-medium">Destructive</p>
            </div>
          </div>
        </Card>

        {/* Button Variants Test */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Button Components</h2>
          <div className="flex flex-wrap gap-4">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
          </div>
        </Card>

        {/* Form Components Test */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Form Components</h2>
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="test-input">Text Input</Label>
              <Input id="test-input" placeholder="Enter text..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-select">Select Input</Label>
              <Select>
                <option>Option 1</option>
                <option>Option 2</option>
                <option>Option 3</option>
              </Select>
            </div>
          </div>
        </Card>

        {/* Alert Component Test */}
        <Alert>
          <h4 className="font-semibold">Configuration Complete!</h4>
          <p className="text-sm">
            Tailwind CSS and shadcn/ui are properly configured with Papa Bolotas branding.
          </p>
        </Alert>

        {/* Touch Target Test (Mobile) */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Touch Targets (44x44px min)</h2>
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
          <h2 className="text-2xl font-semibold mb-4">Responsive Typography</h2>
          <div className="space-y-2">
            <h1 className="text-4xl mobile:text-2xl tablet:text-3xl desktop:text-4xl font-bold">
              Heading 1 (Responsive)
            </h1>
            <h2 className="text-3xl mobile:text-xl tablet:text-2xl desktop:text-3xl font-semibold">
              Heading 2 (Responsive)
            </h2>
            <p className="text-base mobile:text-sm tablet:text-base">
              Body text that scales appropriately across devices.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
