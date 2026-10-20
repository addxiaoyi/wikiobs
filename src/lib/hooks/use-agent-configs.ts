import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import errorToStringRendererProcess from '@/lib/error'
import { AgentConfig } from '../llm/types'
import exampleAgents from '@/components/Chat/ChatConfigComponents/exampleAgents'

interface UseAgentConfigReturn {
  agentConfig: AgentConfig | undefined
  setAgentConfig: React.Dispatch<React.SetStateAction<AgentConfig | undefined>>
}

function useAgentConfig(): UseAgentConfigReturn {
  const [agentConfig, setAgentConfig] = useState<AgentConfig>()

  useEffect(() => {
    const fetchAgentConfigs = async () => {
      try {
        const agentConfigs = await window.electronStore.getAgentConfigs()
        if (agentConfigs && agentConfigs.length > 0) {
          setAgentConfig(agentConfigs[0])
        } else {
          setAgentConfig(exampleAgents[0])
        }
      } catch (error) {
        toast.error(errorToStringRendererProcess(error))
        setAgentConfig(exampleAgents[0])
      }
    }
    fetchAgentConfigs()
  }, [])

  return {
    agentConfig,
    setAgentConfig,
  }
}

export default useAgentConfig
