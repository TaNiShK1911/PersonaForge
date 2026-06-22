# Mini-Services

## Purpose

This directory is reserved for future microservice extraction of compute-intensive ML operations from the main Next.js application.

## Planned Services

As the PersonaForge platform scales, the following components are candidates for extraction into independent services:

- **Causal Inference Engine**: Propensity score matching, IPW, doubly-robust estimation with bootstrap CI computation
- **Persona Clustering Pipeline**: K-means over behavioral feature vectors with dynamic re-clustering
- **Identity Resolution Service**: Deterministic + probabilistic identity matching across channels
- **Bandit Optimization Worker**: Thompson Sampling with real-time reward updates

## Current Status

Not yet implemented. All ML operations currently run in-process within the Next.js API routes.

## Future Architecture

```
┌─────────────────────┐
│   Next.js App       │
│   (Presentation)    │
└──────────┬──────────┘
           │
     gRPC/REST
           │
┌──────────┴──────────┐
│  Mini-Services      │
│  (Compute Layer)    │
├─────────────────────┤
│ • Causal Engine     │
│ • Persona Cluster   │
│ • Identity Resolver │
│ • Bandit Worker     │
└─────────────────────┘
```

This separation will enable:
- Independent scaling of compute-intensive operations
- Language flexibility (Python for ML, Rust for identity graph)
- Isolated failure domains
- Team autonomy (data science vs. product engineering)
