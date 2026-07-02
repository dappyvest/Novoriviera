export type VotingWindowCompetition = {
  manualVotingEnabled: boolean;
  votingEnabled: boolean;
  votingStartsAt: Date | string | null;
  votingEndsAt: Date | string | null;
};

export function getVotingWindowStatus(
  competition: VotingWindowCompetition,
  now = new Date(),
) {
  if (!competition.manualVotingEnabled) {
    return {
      votingOpen: false,
      votingStatusMessage: 'Manual voting is not enabled.',
    };
  }

  if (!competition.votingEnabled) {
    return {
      votingOpen: false,
      votingStatusMessage: 'Voting has not started yet.',
    };
  }

  const startsAt = competition.votingStartsAt
    ? new Date(competition.votingStartsAt)
    : null;
  if (startsAt && now < startsAt) {
    return {
      votingOpen: false,
      votingStatusMessage: 'Voting has not started yet.',
    };
  }

  const endsAt = competition.votingEndsAt
    ? new Date(competition.votingEndsAt)
    : null;
  if (endsAt && now > endsAt) {
    return {
      votingOpen: false,
      votingStatusMessage: 'Voting has ended.',
    };
  }

  return {
    votingOpen: true,
    votingStatusMessage: 'Voting is open.',
  };
}
