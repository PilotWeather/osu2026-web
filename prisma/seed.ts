import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const companies = ["OMAŞ", "UTEK", "TUA", "GDH"];
  const teams = ["Team 1", "Team 2", "Team 3", "Team 4"];

  for (const name of companies) {
    await prisma.company.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  for (const name of teams) {
    await prisma.team.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const personnelSeed = [
    {
      firstName: "Ahmet",
      lastName: "Yılmaz",
      email: "ahmet.yilmaz@pilotweather.pro",
      phone: "+905551234567",
      company: "OMAŞ",
      team: "Team 1",
      licenseNo: "LIC-1042",
      notes: "Team 1 ana eğitmen",
      vehiclePlate: "34 ABC 123",
      birthDate: "1988-04-11",
      tshirtSize: "L",
      credentials: [
        { type: "SEP", expiryDate: "2026-10-14" },
        { type: "SEP_FI", expiryDate: "2026-08-21" },
        { type: "CLASS_1", expiryDate: "2027-02-10" },
      ],
    },
    {
      firstName: "Cem",
      lastName: "Kara",
      email: "cem.kara@pilotweather.pro",
      phone: "+905552345678",
      company: "UTEK",
      team: "Team 2",
      licenseNo: "LIC-2047",
      notes: "Team 2 koordinatörü",
      vehiclePlate: "34 DEF 456",
      birthDate: "1990-06-07",
      tshirtSize: "XL",
      credentials: [
        { type: "SEP", expiryDate: "2026-09-03" },
        { type: "SEP_FI", expiryDate: "2026-11-18" },
        { type: "CLASS_1", expiryDate: "2026-12-04" },
      ],
    },
    {
      firstName: "Deniz",
      lastName: "Arslan",
      email: "deniz.arslan@pilotweather.pro",
      phone: "+905553456789",
      company: "TUA",
      team: "Team 3",
      licenseNo: "LIC-3098",
      notes: "Team 3 operasyon destek",
      vehiclePlate: null,
      birthDate: "1992-10-12",
      tshirtSize: "M",
      credentials: [
        { type: "SEP", expiryDate: "2026-08-17" },
        { type: "SEP_FI", expiryDate: "2026-10-01" },
        { type: "CLASS_1", expiryDate: "2027-01-20" },
      ],
    },
    {
      firstName: "Ece",
      lastName: "Demir",
      email: "ece.demir@pilotweather.pro",
      phone: "+905554567890",
      company: "GDH",
      team: "Team 4",
      licenseNo: "LIC-4182",
      notes: "Team 4 eğitim planlaması",
      vehiclePlate: "34 GHI 789",
      birthDate: "1987-02-18",
      tshirtSize: "S",
      credentials: [
        { type: "SEP", expiryDate: "2027-01-30" },
        { type: "SEP_FI", expiryDate: "2026-09-12" },
        { type: "CLASS_1", expiryDate: null },
      ],
    },
  ];

  for (const item of personnelSeed) {
    const company = await prisma.company.findUnique({ where: { name: item.company } });
    const team = await prisma.team.findUnique({ where: { name: item.team } });

    const created = await prisma.personnel.create({
      data: {
        firstName: item.firstName,
        lastName: item.lastName,
        email: item.email,
        phone: item.phone,
        companyId: company?.id,
        teamId: team?.id,
        licenseNo: item.licenseNo,
        notes: item.notes,
        birthDate: item.birthDate ? new Date(item.birthDate) : null,
        tshirtSize: item.tshirtSize,
        credentials: {
          create: item.credentials.map((credential) => ({
            type: credential.type,
            expiryDate: credential.expiryDate ? new Date(credential.expiryDate) : null,
          })),
        },
        ...(item.vehiclePlate ? { vehicles: { create: [{ plate: item.vehiclePlate }] } } : {}),
      },
    });

    console.log(`Seeded ${created.firstName} ${created.lastName}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
