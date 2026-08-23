import { withAuth } from '../../utils/handler'

export default defineEventHandler((event) => withAuth(event, (_db, context) => ({
  user: {
    id: context.userId,
    nickname: context.userNickname,
    email: context.userEmail,
  },
  pivnica: { id: context.pivnicaId, name: context.nazovPivnice },
  preferences: { defaultContainerLocation: context.defaultContainerLocation },
})))
