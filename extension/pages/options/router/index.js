import Vue from 'vue'
import VueRouter from 'vue-router'
import General from '@/pages/options/views/General.vue'
import Login from '@/pages/options/views/Login.vue'
import Register from '@/pages/options/views/Register.vue'
import Migration from '@/pages/options/views/Migration.vue'
import Help from '@/pages/options/views/Help.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'General',
    component: General,
    meta: {
    }
  },
  {
    path: '/help',
    name: 'Help',
    component: Help,
    meta: {
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: {
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: {
    }
  },
  {
    path: '/migration',
    name: 'Migration',
    component: Migration,
    meta: {
    }
  },
  { path: '*', redirect: '/' }
]

const router = new VueRouter({
  mode: 'hash',
  routes
})

export default router
