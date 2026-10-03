import { withAuth } from '../../utils/handler'

export default defineEventHandler((event) => withAuth(event, (_db, context) => ({
  user: {
    id: context.userId,
    nickname: context.userNickname,
    email: context.userEmail,
  },
  pivnica: { id: context.pivnicaId, name: context.nazovPivnice, role: context.role, logo: context.logo,
    koeficientDosladzaniaMustu: context.koeficientDosladzaniaMustu,
    koeficientDosladzaniaVody: context.koeficientDosladzaniaVody },
  pivnice: context.cellars,
  preferences: { defaultContainerLocation: context.defaultContainerLocation },
})))
