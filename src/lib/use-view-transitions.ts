import { useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { withViewTransition } from './view-transitions'

export function useViewTransitions() {
  const router = useRouter()

  useEffect(() => {
    // Intercept router navigation to add view transitions
    const originalNavigate = router.navigate

    router.navigate = async (options: any) => {
      await new Promise<void>((resolve) => {
        withViewTransition(() => {
          originalNavigate.call(router, options)
          resolve()
        })
      })
    }

    return () => {
      router.navigate = originalNavigate
    }
  }, [router])
}
