import { test } from 'node:test';
import { createSeedMessagingState, toMessagingFirebaseFixture } from '../src/features/messaging/repository.js';

test('seeded inbox conversations have stable participants and Firebase-ready documents', () => {
  const source = createSeedMessagingState();
  const fixture = toMessagingFirebaseFixture(source);
  if (fixture.conversations.length < 3) throw new Error('Expected multiple demo conversations');
  if (!fixture.messages.every((message) => message.conversationId && message.senderId && message.text)) throw new Error('Message fixture is incomplete');
  if (!fixture.conversations.every((conversation) => conversation.participantIds.length >= 2)) throw new Error('Conversation participants are incomplete');
});
