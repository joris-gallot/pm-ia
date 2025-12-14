import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('@/views/Home.vue'),
    },
    {
      path: '/account',
      name: 'Account',
      component: () => import('@/views/Account.vue'),
    },
    {
      path: '/billing',
      name: 'Billing',
      component: () => import('@/views/Billing.vue'),
    },
    {
      path: '/signin',
      name: 'Signin',
      component: () => import('@/views/Signin.vue'),
      meta: {
        layout: 'auth',
      },
    },
    {
      path: '/signup',
      name: 'Signup',
      component: () => import('@/views/Signup.vue'),
      meta: {
        layout: 'auth',
      },
    },
    {
      path: '/admin-dashboard',
      name: 'AdminDashboard',
      component: () => import('@/views/AdminDashboard.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'Error404',
      component: () => import('@/views/Error404.vue'),
    },
  ],
})

export default router
