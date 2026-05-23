"use client"

import { Component, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorBoundaryProps {
  children: ReactNode
  sectionName: string
  fallbackMessage?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary - ${this.props.sectionName}]`, error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-8"
          role="alert"
          aria-label={`Erro na seção ${this.props.sectionName}`}
        >
          <AlertTriangle className="h-10 w-10 text-destructive/70" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-medium text-foreground">
            Erro em {this.props.sectionName}
          </h3>
          <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
            {this.props.fallbackMessage ??
              "Ocorreu um erro inesperado nesta seção. As demais seções continuam funcionando normalmente."}
          </p>
          {this.state.error && (
            <p className="mt-2 max-w-md truncate text-center text-xs text-muted-foreground/70">
              {this.state.error.message}
            </p>
          )}
          <Button
            variant="outline"
            className="mt-4 min-h-[44px] gap-2"
            onClick={this.handleRetry}
            aria-label={`Tentar carregar ${this.props.sectionName} novamente`}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Tentar novamente
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
