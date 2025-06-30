"use client"

import type React from "react"

import { motion } from "framer-motion"
import { Copy, Check, ExternalLink, AlertCircle, Info, CheckCircle } from "lucide-react"
import { useState } from "react"
import { Button } from "../../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"

export default function DocumentationContent() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const CodeBlock = ({ code, language, id }: { code: string; language: string; id: string }) => (
    <div className="relative bg-muted border border-border rounded-lg overflow-hidden"> {/* Changed dark classes */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-200 dark:bg-slate-700 border-b border-border"> {/* Changed dark classes, added dark: for header */}
        <span className="text-sm text-muted-foreground">{language}</span> {/* Changed text color */}
        <button
          onClick={() => copyToClipboard(code, id)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors" // Changed text color
        >
          {copiedCode === id ? (
            <>
              <Check className="w-4 h-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm text-foreground/90">{code}</code> {/* Changed text color */}
      </pre>
    </div>
  )

  const AlertBox = ({
    type,
    title,
    children,
  }: { type: "info" | "warning" | "success"; title: string; children: React.ReactNode }) => {
    const icons = {
      info: Info,
      warning: AlertCircle,
      success: CheckCircle,
    }
    const colors = {
      info: "border-blue-500/50 bg-blue-500/10",
      warning: "border-yellow-500/50 bg-yellow-500/10",
      success: "border-green-500/50 bg-green-500/10",
    }
    const Icon = icons[type]

    return (
      <div className={`border rounded-lg p-4 ${colors[type]}`}>
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-5 h-5" /> {/* Icon color will depend on its own definition, usually inherits text color or is explicit */}
          <h4 className="font-semibold text-foreground">{title}</h4> {/* Changed text color */}
        </div>
        {/* For the content, using a slightly more prominent color than plain muted-foreground for alerts */}
        <div className="text-foreground/80 dark:text-slate-300">{children}</div> {/* Changed text color, added dark: variant */}
      </div>
    )
  }

  return (
    <div className="space-y-12">
      {/* Introduction */}
      <motion.section
        id="introduction"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl font-bold text-foreground mb-6">Documentation</h1>
        <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
          Welcome to DesignStudio's comprehensive documentation. Learn how to integrate our powerful design system and
          development tools into your projects.
        </p>

        <AlertBox type="info" title="Getting Started">
          This documentation covers everything from basic setup to advanced customization. Follow the sections in order
          for the best learning experience.
        </AlertBox>
      </motion.section>

      {/* Installation */}
      <motion.section
        id="installation"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2 className="text-3xl font-bold text-foreground mb-6">Installation</h2>
        <p className="text-muted-foreground mb-6">
          Get started by installing DesignStudio in your project using your preferred package manager.
        </p>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground">Using npm</h3>
          <CodeBlock code="npm install @designstudio/core @designstudio/components" language="bash" id="npm-install" />

          <h3 className="text-xl font-semibold text-foreground">Using yarn</h3>
          <CodeBlock code="yarn add @designstudio/core @designstudio/components" language="bash" id="yarn-install" />

          <h3 className="text-xl font-semibold text-foreground">Using pnpm</h3>
          <CodeBlock code="pnpm add @designstudio/core @designstudio/components" language="bash" id="pnpm-install" />
        </div>
      </motion.section>

      {/* Quick Start */}
      <motion.section
        id="quick-start"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2 className="text-3xl font-bold text-foreground mb-6">Quick Start</h2>
        <p className="text-muted-foreground mb-6">
          Set up DesignStudio in your React application with just a few lines of code.
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-3">1. Import the Provider</h3>
            <CodeBlock
              code={`import { DesignStudioProvider } from '@designstudio/core'
import '@designstudio/core/styles.css'

function App() {
  return (
    <DesignStudioProvider theme="dark">
      {/* Your app content */}
    </DesignStudioProvider>
  )
}`}
              language="tsx"
              id="provider-setup"
            />
          </div>

          <div>
            <h3 className="text-xl font-semibold text-foreground mb-3">2. Use Components</h3>
            <CodeBlock
              code={`import { Button, Card } from '@designstudio/components'

export default function MyComponent() {
  return (
    <Card>
      <h2>Welcome to DesignStudio</h2>
      <Button variant="primary">Get Started</Button>
    </Card>
  )
}`}
              language="tsx"
              id="component-usage"
            />
          </div>
        </div>

        <AlertBox type="success" title="You're Ready!">
          That's it! You now have DesignStudio set up in your project. Explore the components section to see what's
          available.
        </AlertBox>
      </motion.section>

      {/* Configuration */}
      <motion.section
        id="configuration"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2 className="text-3xl font-bold text-foreground mb-6">Configuration</h2>
        <p className="text-muted-foreground mb-6">Customize DesignStudio to match your brand and requirements.</p>

        <div className="space-y-6">
          <Card> {/* Removed dark-theme specific classes bg-zinc-900/50 border-zinc-800 */}
            <CardHeader>
              {/* text-white removed, CardTitle should inherit */}
              <CardTitle>Theme Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={`const theme = {
  colors: {
    primary: '#3b82f6',
    secondary: '#64748b',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem'
  }
}

<DesignStudioProvider theme={theme}>
  <App />
</DesignStudioProvider>`}
                language="tsx"
                id="theme-config"
              />
            </CardContent>
          </Card>
        </div>
      </motion.section>

      {/* API Reference */}
      <motion.section
        id="authentication"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2 className="text-3xl font-bold text-foreground mb-6">API Reference</h2>

        <div className="space-y-8">
          <div id="authentication">
            <h3 className="text-2xl font-semibold text-foreground mb-4">Authentication</h3>
            <p className="text-muted-foreground mb-4">
              All API requests require authentication using an API key in the header.
            </p>

            <CodeBlock
              code={`curl -X GET "https://api.designstudio.com/v1/components" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
              language="bash"
              id="auth-example"
            />
          </div>

          <div id="endpoints">
            <h3 className="text-2xl font-semibold text-foreground mb-4">Endpoints</h3>
            <div className="grid gap-4">
              {/* Removed dark-theme specific classes from Card */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-mono rounded">GET</span>
                    {/* text-slate-300 changed to text-muted-foreground or similar for code */}
                    <code className="text-muted-foreground">/api/v1/components</code>
                  </div>
                  <p className="text-muted-foreground text-sm">Retrieve all available components</p>
                </CardContent>
              </Card>

              {/* Removed dark-theme specific classes from Card */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-mono rounded">POST</span>
                    {/* text-slate-300 changed to text-muted-foreground or similar for code */}
                    <code className="text-muted-foreground">/api/v1/components</code>
                  </div>
                  <p className="text-muted-foreground text-sm">Create a new custom component</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Components */}
      <motion.section
        id="buttons"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2 className="text-3xl font-bold text-foreground mb-6">Components</h2>

        <div className="space-y-8">
          <div id="buttons">
            <h3 className="text-2xl font-semibold text-foreground mb-4">Buttons</h3>
            <p className="text-muted-foreground mb-6">Versatile button components with multiple variants and states.</p>

            <div className="space-y-4">
              {/* Adjusted preview box for light theme */}
              <div className="flex flex-wrap gap-4 p-6 bg-muted border border-border rounded-lg">
                <Button>Default</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>

              <CodeBlock
                code={`import { Button } from '@designstudio/components'

// Basic usage
<Button>Click me</Button>

// With variants
<Button variant="outline">Outline Button</Button>
<Button variant="ghost">Ghost Button</Button>

// With sizes
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>

// With loading state
<Button loading>Loading...</Button>`}
                language="tsx"
                id="button-examples"
              />
            </div>
          </div>
        </div>
      </motion.section>

      {/* FAQ */}
      <motion.section
        id="faq"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2 className="text-3xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>

        <div className="space-y-6">
          {/* Removed dark-theme specific classes from Card, CardTitle, and p */}
          <Card>
            <CardHeader>
              <CardTitle>How do I customize the theme?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                You can customize the theme by passing a theme object to the DesignStudioProvider. See the Configuration
                section for detailed examples.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Is DesignStudio compatible with Next.js?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Yes! DesignStudio is fully compatible with Next.js, including App Router and Server Components. Check
                our Next.js integration guide for specific setup instructions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How do I report bugs or request features?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                You can report bugs or request features through our GitHub repository or by contacting our support team.
                We appreciate all feedback and contributions from the community.
              </p>
            </CardContent>
          </Card>
        </div>
      </motion.section>

      {/* Contact */}
      <motion.section
        id="contact"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="pb-12"
      >
        <h2 className="text-3xl font-bold text-foreground mb-6">Need Help?</h2>
        <p className="text-muted-foreground mb-8">Can't find what you're looking for? Our team is here to help.</p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Removed dark-theme specific classes from Card, h3, p */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-foreground mb-3">Community Support</h3>
              <p className="text-muted-foreground mb-4">
                Join our Discord community to get help from other developers and our team.
              </p>
              {/* Using default outline button variant for light theme */}
              <Button variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                Join Discord
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-foreground mb-3">Enterprise Support</h3>
              <p className="text-muted-foreground mb-4">
                Get priority support and dedicated assistance for your enterprise needs.
              </p>
              {/* Changed to default button variant for "blue button" style */}
              <Button variant="default">Contact Sales</Button>
            </CardContent>
          </Card>
        </div>
      </motion.section>
    </div>
  )
}
