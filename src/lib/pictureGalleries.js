export const pictureGalleries = [
  {
    title: "Lab trip, April 2022",
    href: "/copy-of-lab-trip-dec-2021/",
    cover: "/media/bb640f_036ee6c918014150b752963dc3a513bb-mv2.jpeg",
  },
  {
    title: "Kfar Blum 2022",
    href: "/copy-of-ein-gedi-2015/",
    cover: "/media/bb640f_93f0dee29418448cb0c356e5be789f34-mv2.jpeg",
  },
  {
    title: "Lab trip, Dec. 2021",
    href: "/copy-of-lab-trip-jun-2021/",
    cover: "/media/bb640f_fb792f6d228e4c358fdb3251c3cafd84-mv2.jpeg",
  },
  {
    title: "Lab trip, June 2021",
    href: "/copy-of-lab-trip-2021/",
    cover: "/media/bb640f_37cb903562d54358b4d9ff7bc07227b0-mv2.jpeg",
  },
  {
    title: "Lab trip, Feb 2021",
    href: "/copy-of-lab-trip-2020/",
    cover: "/media/bb640f_b3b75aff5b824eac8b42120d6eb5803a-mv2.jpeg",
  },
  {
    title: "Random years",
    href: "/pictures/us/",
    cover: "/media/bb640f_07589b9f5a594b7690ea1fb2deebe598-mv2.jpg",
  },
  {
    title: "Lab trip, Jan 2020",
    href: "/lab-trip-2019/",
    cover: "/media/bb640f_c835d888d0674f488fec5d7aef122c8c-mv2.jpg",
  },
  {
    title: "Lab trip, Apr 2016",
    href: "/lab-trip-2016/",
    cover: "/media/bb640f_4b29d9838f9c4d88b010fc63a0f2c663-mv2.jpg",
  },
  {
    title: "Ein-Gedi conference, 2015",
    href: "/ein-gedi-15/",
    cover: "/media/bb640f_0c3b221150d942ef8aa124eda3a2d9c7.jpg",
  },
  {
    title: "Lab trip, Aug 2015",
    href: "/lab-trip-2015/",
    cover: "/media/bb640f_f4515f9054054aa5be5df9ac7438aba1.jpg",
  },
  {
    title: "Lab trip, Dec 2014",
    href: "/lab-trip-2014/",
    cover: "/media/bb640f_a4830c9b33ac4df2bd5d6b3de700e6a8.jpg",
  },
];

export function pictureGalleryForPath(pathname) {
  return pictureGalleries.find((gallery) => gallery.href === pathname);
}
