/**
 * WikiObsLogo.tsx
 * High-definition Obsidian multifaceted crystal & knowledge graph emblem for WIKIOBS.
 */

import React from 'react'

export interface WikiObsLogoProps {
  size?: number
  className?: string
  glow?: boolean
}

export const WikiObsLogo: React.FC<WikiObsLogoProps> = ({
  size = 24,
  className = '',
  glow = true,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
      aria-label="WIKIOBS Logo"
    >
      <defs>
        {glow && (
          <radialGradient id="wikiObsAura" cx="50%" cy="48%" r="48%">
            <stop offset="0%" stopColor="#9333ea" stopOpacity="0.45" />
            <stop offset="45%" stopColor="#7b68ee" stopOpacity="0.22" />
            <stop offset="75%" stopColor="#6366f1" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        )}

        <linearGradient id="wikiObsFacetTL" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e9d5ff" />
          <stop offset="30%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>

        <linearGradient id="wikiObsFacetTR" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ddd6fe" />
          <stop offset="40%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>

        <linearGradient id="wikiObsFacetCenter" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="60%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>

        <linearGradient id="wikiObsFacetMidL" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>

        <linearGradient id="wikiObsFacetMidR" x1="100%" y1="50%" x2="0%" y2="50%">
          <stop offset="0%" stopColor="#6d28d9" />
          <stop offset="60%" stopColor="#5b21b6" />
          <stop offset="100%" stopColor="#3b0764" />
        </linearGradient>

        <linearGradient id="wikiObsFacetCore" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="50%" stopColor="#7b68ee" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>

        <linearGradient id="wikiObsFacetLowL" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#581c87" />
          <stop offset="60%" stopColor="#3b0764" />
          <stop offset="100%" stopColor="#1e1138" />
        </linearGradient>

        <linearGradient id="wikiObsFacetLowR" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4c1d95" />
          <stop offset="60%" stopColor="#2e1065" />
          <stop offset="100%" stopColor="#140a26" />
        </linearGradient>

        <linearGradient id="wikiObsKeelL" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#4338ca" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </linearGradient>

        <linearGradient id="wikiObsKeelR" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#3730a3" />
          <stop offset="100%" stopColor="#0f0e26" />
        </linearGradient>

        <filter id="wikiObsNodeGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {glow && <circle cx="256" cy="256" r="235" fill="url(#wikiObsAura)" />}

      <polygon
        points="256,38 418,146 448,284 362,428 256,482 150,428 64,284 94,146"
        fill="#0e0a1a"
        stroke="#7b68ee"
        strokeOpacity="0.3"
        strokeWidth="1.5"
      />

      <polygon
        points="256,38 94,146 178,210 256,168"
        fill="url(#wikiObsFacetTL)"
        stroke="#d8b4fe"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      <polygon
        points="256,38 256,168 334,210 418,146"
        fill="url(#wikiObsFacetTR)"
        stroke="#c084fc"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      <polygon
        points="256,168 178,210 256,268 334,210"
        fill="url(#wikiObsFacetCenter)"
        stroke="#a855f7"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <polygon
        points="94,146 64,284 162,298 178,210"
        fill="url(#wikiObsFacetMidL)"
        stroke="#818cf8"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <polygon
        points="418,146 334,210 350,298 448,284"
        fill="url(#wikiObsFacetMidR)"
        stroke="#6366f1"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <polygon
        points="178,210 162,298 214,354 256,268"
        fill="url(#wikiObsFacetCore)"
        stroke="#a78bfa"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      <polygon
        points="256,268 214,354 256,378 298,354"
        fill="#6d28d9"
        stroke="#9333ea"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <polygon
        points="256,268 298,354 350,298 334,210"
        fill="url(#wikiObsFacetCore)"
        stroke="#a78bfa"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      <polygon
        points="64,284 150,428 214,354 162,298"
        fill="url(#wikiObsFacetLowL)"
        stroke="#581c87"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <polygon
        points="448,284 350,298 298,354 362,428"
        fill="url(#wikiObsFacetLowR)"
        stroke="#4c1d95"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <polygon
        points="150,428 256,482 256,378 214,354"
        fill="url(#wikiObsKeelL)"
        stroke="#4338ca"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <polygon
        points="362,428 298,354 256,378 256,482"
        fill="url(#wikiObsKeelR)"
        stroke="#3730a3"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <g stroke="#e0e7ff" strokeWidth="1.2" strokeOpacity="0.85">
        <line x1="256" y1="168" x2="178" y2="210" />
        <line x1="256" y1="168" x2="334" y2="210" />
        <line x1="178" y1="210" x2="256" y2="268" />
        <line x1="334" y1="210" x2="256" y2="268" />
        <line x1="256" y1="268" x2="214" y2="354" />
        <line x1="256" y1="268" x2="298" y2="354" />
        <line x1="214" y1="354" x2="256" y2="378" />
        <line x1="298" y1="354" x2="256" y2="378" />
      </g>

      <g filter="url(#wikiObsNodeGlow)">
        <circle cx="256" cy="38" r="4.5" fill="#ffffff" />
        <circle cx="256" cy="168" r="5" fill="#f5f3ff" />
        <circle cx="178" cy="210" r="4" fill="#ffffff" />
        <circle cx="334" cy="210" r="4" fill="#ffffff" />
        <circle cx="256" cy="268" r="6" fill="#ffffff" />
        <circle cx="214" cy="354" r="4.5" fill="#ffffff" />
        <circle cx="298" cy="354" r="4.5" fill="#ffffff" />
        <circle cx="256" cy="378" r="4" fill="#ede9fe" />
      </g>
    </svg>
  )
}

export default WikiObsLogo
