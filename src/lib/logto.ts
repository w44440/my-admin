import { UserScope, type LogtoConfig } from '@logto/react'

export const logtoEndpoint = import.meta.env.VITE_LOGTO_ENDPOINT as string | undefined
export const logtoAppId = import.meta.env.VITE_LOGTO_APP_ID as string | undefined
export const appUrl = (import.meta.env.VITE_APP_URL as string | undefined) || window.location.origin
export const callbackUrl = `${appUrl.replace(/\/$/, '')}/callback`
export const isLogtoConfigured = Boolean(logtoEndpoint && logtoAppId)

export const logtoConfig: LogtoConfig = {
  endpoint: logtoEndpoint || 'https://placeholder.logto.app',
  appId: logtoAppId || 'placeholder-app-id',
  scopes: [UserScope.Email],
}
