import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/aprendizado",
    },
    {
      path: "/aprendizado",
      name: "aprendizado",
      component: () => import("../pages/AprendizadoPage.vue"),
    },
    {
      path: "/comparador",
      name: "comparador",
      component: () => import("../pages/ComparadorPage.vue"),
    },
    {
      path: "/historico",
      name: "historico",
      component: () => import("../pages/HistoricoPage.vue"),
    },
  ],
});

export default router;
