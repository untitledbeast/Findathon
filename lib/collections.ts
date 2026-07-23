import { Collection } from './types/collections';

export const CURATED_COLLECTIONS: Collection[] = [
  {
    id: 'ai-top',
    title: 'Top AI Hackathons',
    description: 'Best artificial intelligence & LLM events',
    emoji: '🤖',
    query: { tags: ['AI'] }
  },
  {
    id: 'beginner-friendly',
    title: 'Beginner Friendly',
    description: 'Perfect for your first hackathon experience',
    emoji: '🌱',
    query: { difficulty: 'beginner' }
  },
  {
    id: 'big-prizes',
    title: 'Big Prize Pools',
    description: 'Events with prize pools over ₹50,000+',
    emoji: '💰',
    query: { prizeMin: 50000 }
  },
  {
    id: 'online-global',
    title: '100% Online',
    description: 'Join from anywhere in the world',
    emoji: '🌐',
    query: { isOnline: true }
  },
  {
    id: 'web3-crypto',
    title: 'Web3 & Blockchain',
    description: 'Decentralized future builders',
    emoji: '⛓',
    query: { tags: ['Web3'] }
  }
];
