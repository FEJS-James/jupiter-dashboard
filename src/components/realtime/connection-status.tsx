'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Wifi, WifiOff, RotateCcw, AlertCircle } from 'lucide-react'
import { useWebSocket, ConnectionStatus } from '@/contexts/websocket-context'
import { cn } from '@/lib/utils'

interface ConnectionStatusProps {
  className?: string
  showLabel?: boolean
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusProps> = ({ 
  className,
  showLabel = true 
}) => {
  const { connectionStatus, connect } = useWebSocket()

  const getStatusConfig = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          label: 'Connected',
          variant: 'default' as const,
          color: 'text-green-500',
          bgColor: 'bg-green-500/20 hover:bg-green-500/30',
          description: 'Real-time updates active'
        }
      case 'connecting':
        return {
          icon: RotateCcw,
          label: 'Connecting',
          variant: 'secondary' as const,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/20 hover:bg-yellow-500/30',
          description: 'Establishing connection...'
        }
      case 'reconnecting':
        return {
          icon: RotateCcw,
          label: 'Reconnecting',
          variant: 'secondary' as const,
          color: 'text-orange-500 animate-spin',
          bgColor: 'bg-orange-500/20 hover:bg-orange-500/30',
          description: 'Attempting to reconnect...'
        }
      case 'error':
        return {
          icon: AlertCircle,
          label: 'Error',
          variant: 'destructive' as const,
          color: 'text-red-500',
          bgColor: 'bg-red-500/20 hover:bg-red-500/30',
          description: 'Connection failed'
        }
      default:
        return {
          icon: WifiOff,
          label: 'Disconnected',
          variant: 'outline' as const,
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/20 hover:bg-gray-500/30',
          description: 'Real-time updates disabled'
        }
    }
  }

  const config = getStatusConfig(connectionStatus)
  const Icon = config.icon

  const handleReconnect = () => {
    if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
      connect()
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-2', className)}>
            {showLabel ? (
              <Badge 
                variant={config.variant}
                className={cn(
                  'cursor-pointer transition-colors',
                  config.bgColor
                )}
                onClick={handleReconnect}
              >
                <Icon className={cn('w-3 h-3 mr-1', config.color)} />
                {config.label}
              </Badge>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 w-8 p-0 transition-colors',
                  config.bgColor
                )}
                onClick={handleReconnect}
              >
                <Icon className={cn('w-4 h-4', config.color)} />
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-medium">{config.description}</p>
            {(connectionStatus === 'disconnected' || connectionStatus === 'error') && (
              <p className="text-xs text-muted-foreground mt-1">
                Click to reconnect
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}