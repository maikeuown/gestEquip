import { PrismaClient, UserRole, EquipmentStatus, MaintenancePriority, MaintenanceStatus, DayOfWeek } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  const institution = await prisma.institution.upsert({
    where: { taxId: '500000000' },
    update: {},
    create: {
      name: 'Escola Secundária Demo',
      shortName: 'ESD',
      taxId: '500000000',
      email: 'admin@escola-demo.pt',
      phone: '+351 210 000 000',
      address: 'Rua da Escola, 1',
      city: 'Lisboa',
      postalCode: '1000-001',
      country: 'Portugal',
      isActive: true,
    },
  });
  console.log('✅ Institution:', institution.name);

  const adminHash = await argon2.hash('Admin@1234');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sgei.pt' },
    update: {},
    create: {
      institutionId: institution.id,
      email: 'admin@sgei.pt',
      passwordHash: adminHash,
      firstName: 'Administrador',
      lastName: 'Sistema',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  const techHash = await argon2.hash('Tech@1234');
  const technician = await prisma.user.upsert({
    where: { email: 'tecnico@sgei.pt' },
    update: {},
    create: {
      institutionId: institution.id,
      email: 'tecnico@sgei.pt',
      passwordHash: techHash,
      firstName: 'João',
      lastName: 'Técnico',
      role: UserRole.TECHNICIAN,
      isActive: true,
    },
  });

  const teacherHash = await argon2.hash('Teacher@1234');
  const teacher = await prisma.user.upsert({
    where: { email: 'professor@sgei.pt' },
    update: {},
    create: {
      institutionId: institution.id,
      email: 'professor@sgei.pt',
      passwordHash: teacherHash,
      firstName: 'Maria',
      lastName: 'Professora',
      role: UserRole.TEACHER,
      isActive: true,
    },
  });
  console.log('✅ Users created');

  const pcType = await prisma.equipmentType.upsert({
    where: { id: 'et-pc-001' },
    update: {},
    create: {
      id: 'et-pc-001',
      institutionId: institution.id,
      name: 'Computador Desktop',
      description: 'Computadores de mesa',
      icon: 'monitor',
      fields: [
        { key: 'processor', label: 'Processador', type: 'text' },
        { key: 'ram', label: 'RAM (GB)', type: 'number' },
        { key: 'storage', label: 'Armazenamento', type: 'text' },
        { key: 'os', label: 'Sistema Operativo', type: 'text' },
      ],
    },
  });

  const laptopType = await prisma.equipmentType.upsert({
    where: { id: 'et-laptop-001' },
    update: {},
    create: {
      id: 'et-laptop-001',
      institutionId: institution.id,
      name: 'Portátil',
      description: 'Computadores portáteis',
      icon: 'laptop',
      fields: [
        { key: 'processor', label: 'Processador', type: 'text' },
        { key: 'ram', label: 'RAM (GB)', type: 'number' },
        { key: 'storage', label: 'Armazenamento', type: 'text' },
        { key: 'screen_size', label: 'Tamanho do Ecrã', type: 'text' },
      ],
    },
  });

  const projectorType = await prisma.equipmentType.upsert({
    where: { id: 'et-proj-001' },
    update: {},
    create: {
      id: 'et-proj-001',
      institutionId: institution.id,
      name: 'Projetor',
      description: 'Projetores e videoprojetores',
      icon: 'video',
      fields: [
        { key: 'lumens', label: 'Lumens', type: 'number' },
        { key: 'resolution', label: 'Resolução', type: 'text' },
      ],
    },
  });

  const printerType = await prisma.equipmentType.upsert({
    where: { id: 'et-print-001' },
    update: {},
    create: {
      id: 'et-print-001',
      institutionId: institution.id,
      name: 'Impressora',
      description: 'Impressoras e multifunções',
      icon: 'printer',
      fields: [
        { key: 'type', label: 'Tipo', type: 'text' },
        { key: 'color', label: 'A Cores', type: 'boolean' },
        { key: 'network', label: 'Rede', type: 'boolean' },
      ],
    },
  });
  console.log('✅ Equipment types created');

  const lab1 = await prisma.room.upsert({
    where: { id: 'room-lab1' },
    update: {},
    create: {
      id: 'room-lab1',
      institutionId: institution.id,
      name: 'Laboratório de Informática 1',
      code: 'LAB-INF-01',
      building: 'Bloco A',
      floor: '1º Piso',
      capacity: 30,
    },
  });

  const sala101 = await prisma.room.upsert({
    where: { id: 'room-sala101' },
    update: {},
    create: {
      id: 'room-sala101',
      institutionId: institution.id,
      name: 'Sala 101',
      code: 'SALA-101',
      building: 'Bloco B',
      floor: '1º Piso',
      capacity: 30,
    },
  });
  console.log('✅ Rooms created');

  const eq1 = await prisma.equipment.upsert({
    where: { serialNumber: 'DELL-7090-001' },
    update: {},
    create: {
      id: 'eq-001',
      name: 'PC Desktop 001',
      brand: 'Dell',
      model: 'OptiPlex 7090',
      serialNumber: 'DELL-7090-001',
      inventoryNumber: 'INV-2024-001',
      status: EquipmentStatus.ACTIVE,
      equipmentTypeId: pcType.id,
      roomId: lab1.id,
      institutionId: institution.id,
      createdById: admin.id,
      acquisitionDate: new Date('2024-01-15'),
      warrantyExpiry: new Date('2027-01-15'),
      qrCode: 'SGEI-EQ-001',
      acquisitionCost: 850.00,
      specifications: { processor: 'Intel Core i7-11700', ram: 16, storage: '512GB SSD', os: 'Windows 11 Pro' },
    },
  });

  await prisma.equipment.upsert({
    where: { serialNumber: 'LEN-L14-003' },
    update: {},
    create: {
      id: 'eq-003',
      name: 'Portátil Professor 01',
      brand: 'Lenovo',
      model: 'ThinkPad L14',
      serialNumber: 'LEN-L14-003',
      inventoryNumber: 'INV-2024-003',
      status: EquipmentStatus.ACTIVE,
      equipmentTypeId: laptopType.id,
      assignedToId: teacher.id,
      institutionId: institution.id,
      createdById: admin.id,
      acquisitionDate: new Date('2024-01-15'),
      warrantyExpiry: new Date('2027-01-15'),
      qrCode: 'SGEI-EQ-003',
      acquisitionCost: 750.00,
      specifications: { processor: 'AMD Ryzen 5 5600U', ram: 16, storage: '512GB SSD', screen_size: '14"' },
    },
  });

  const eq5 = await prisma.equipment.upsert({
    where: { serialNumber: 'HP-LJ428-005' },
    update: {},
    create: {
      id: 'eq-005',
      name: 'Impressora Multifunções Lab1',
      brand: 'HP',
      model: 'LaserJet Pro M428fdn',
      serialNumber: 'HP-LJ428-005',
      inventoryNumber: 'INV-2024-005',
      status: EquipmentStatus.MAINTENANCE,
      equipmentTypeId: printerType.id,
      roomId: lab1.id,
      institutionId: institution.id,
      createdById: admin.id,
      acquisitionDate: new Date('2024-01-15'),
      warrantyExpiry: new Date('2027-01-15'),
      qrCode: 'SGEI-EQ-005',
      acquisitionCost: 420.00,
      specifications: { type: 'Laser', color: false, network: true },
    },
  });
  console.log('✅ Equipment created');

  await prisma.maintenanceTicket.upsert({
    where: { ticketNumber: 'TKT-2024-0001' },
    update: {},
    create: {
      institutionId: institution.id,
      equipmentId: eq5.id,
      reportedById: teacher.id,
      assignedToId: technician.id,
      ticketNumber: 'TKT-2024-0001',
      title: 'Impressora não imprime',
      description: 'A impressora multifunções do Laboratório 1 não está a imprimir. Apresenta erro no painel.',
      priority: MaintenancePriority.HIGH,
      status: MaintenanceStatus.IN_PROGRESS,
    },
  });

  await prisma.maintenanceTicket.upsert({
    where: { ticketNumber: 'TKT-2024-0002' },
    update: {},
    create: {
      institutionId: institution.id,
      equipmentId: eq1.id,
      reportedById: admin.id,
      ticketNumber: 'TKT-2024-0002',
      title: 'Manutenção preventiva PC Lab1',
      description: 'Limpeza e verificação periódica do equipamento.',
      priority: MaintenancePriority.LOW,
      status: MaintenanceStatus.OPEN,
      isPreventive: true,
    },
  });
  console.log('✅ Maintenance tickets created');

  // Additional rooms for schedules
  const sala201 = await prisma.room.upsert({
    where: { id: 'room-sala201' },
    update: {},
    create: {
      id: 'room-sala201',
      institutionId: institution.id,
      name: 'Sala 201',
      code: 'SALA-201',
      building: 'Bloco B',
      floor: '2º Piso',
      capacity: 25,
    },
  });

  const sala202 = await prisma.room.upsert({
    where: { id: 'room-sala202' },
    update: {},
    create: {
      id: 'room-sala202',
      institutionId: institution.id,
      name: 'Sala 202',
      code: 'SALA-202',
      building: 'Bloco B',
      floor: '2º Piso',
      capacity: 25,
    },
  });

  const lab2 = await prisma.room.upsert({
    where: { id: 'room-lab2' },
    update: {},
    create: {
      id: 'room-lab2',
      institutionId: institution.id,
      name: 'Laboratório de Informática 2',
      code: 'LAB-INF-02',
      building: 'Bloco A',
      floor: '2º Piso',
      capacity: 28,
    },
  });

  const auditorio = await prisma.room.upsert({
    where: { id: 'room-audit' },
    update: {},
    create: {
      id: 'room-audit',
      institutionId: institution.id,
      name: 'Auditório',
      code: 'AUD-01',
      building: 'Bloco C',
      floor: 'Piso 0',
      capacity: 120,
    },
  });
  console.log('✅ Additional rooms created');

  // Equipment in new rooms
  await prisma.equipment.upsert({
    where: { serialNumber: 'EPSON-EB-101' },
    update: {},
    create: {
      name: 'Projetor Sala 201',
      brand: 'Epson',
      model: 'EB-W51',
      serialNumber: 'EPSON-EB-101',
      inventoryNumber: 'INV-2024-101',
      status: EquipmentStatus.ACTIVE,
      equipmentTypeId: projectorType.id,
      roomId: sala201.id,
      institutionId: institution.id,
      createdById: admin.id,
      qrCode: 'SGEI-EQ-101',
    },
  });

  await prisma.equipment.upsert({
    where: { serialNumber: 'DELL-7090-102' },
    update: {},
    create: {
      name: 'PC Desktop Sala 201',
      brand: 'Dell',
      model: 'OptiPlex 7090',
      serialNumber: 'DELL-7090-102',
      inventoryNumber: 'INV-2024-102',
      status: EquipmentStatus.ACTIVE,
      equipmentTypeId: pcType.id,
      roomId: sala201.id,
      institutionId: institution.id,
      createdById: admin.id,
      qrCode: 'SGEI-EQ-102',
    },
  });

  await prisma.equipment.upsert({
    where: { serialNumber: 'EPSON-EB-103' },
    update: {},
    create: {
      name: 'Projetor Lab 2',
      brand: 'Epson',
      model: 'EB-X51',
      serialNumber: 'EPSON-EB-103',
      inventoryNumber: 'INV-2024-103',
      status: EquipmentStatus.ACTIVE,
      equipmentTypeId: projectorType.id,
      roomId: lab2.id,
      institutionId: institution.id,
      createdById: admin.id,
      qrCode: 'SGEI-EQ-103',
    },
  });
  console.log('✅ Additional equipment created');

  // Schedules (Horários) — mock data for a realistic school
  const today = new Date();
  const currentDayIndex = today.getDay(); // 0=Sun, 1=Mon, ...
  const dayMap: DayOfWeek[] = [DayOfWeek.SUNDAY, DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY];
  const currentDay = dayMap[currentDayIndex];

  // Delete existing schedules to avoid duplicates on re-seed
  await prisma.schedule.deleteMany({});

  const scheduleData = [
    // LAB 1 — busy most of the day
    { roomId: lab1.id, day: DayOfWeek.MONDAY, startTime: '08:30', endTime: '10:00', subject: 'Programação Web', teacher: 'Prof. António Silva' },
    { roomId: lab1.id, day: DayOfWeek.MONDAY, startTime: '10:15', endTime: '11:45', subject: 'Bases de Dados', teacher: 'Prof. Carlos Mendes' },
    { roomId: lab1.id, day: DayOfWeek.MONDAY, startTime: '14:00', endTime: '15:30', subject: 'Redes de Computadores', teacher: 'Prof. Rui Costa' },
    { roomId: lab1.id, day: DayOfWeek.TUESDAY, startTime: '08:30', endTime: '10:00', subject: 'Sistemas Operativos', teacher: 'Prof. Rui Costa' },
    { roomId: lab1.id, day: DayOfWeek.TUESDAY, startTime: '14:00', endTime: '15:30', subject: 'Programação Web', teacher: 'Prof. António Silva' },
    { roomId: lab1.id, day: DayOfWeek.WEDNESDAY, startTime: '10:15', endTime: '11:45', subject: 'Algoritmos', teacher: 'Prof. Carlos Mendes' },
    { roomId: lab1.id, day: DayOfWeek.WEDNESDAY, startTime: '14:00', endTime: '15:30', subject: 'Bases de Dados', teacher: 'Prof. Carlos Mendes' },
    { roomId: lab1.id, day: DayOfWeek.THURSDAY, startTime: '08:30', endTime: '10:00', subject: 'Redes de Computadores', teacher: 'Prof. Rui Costa' },
    { roomId: lab1.id, day: DayOfWeek.THURSDAY, startTime: '10:15', endTime: '11:45', subject: 'Programação Web', teacher: 'Prof. António Silva' },
    { roomId: lab1.id, day: DayOfWeek.FRIDAY, startTime: '08:30', endTime: '10:00', subject: 'Projeto Final', teacher: 'Prof. António Silva' },

    // LAB 2 — somewhat busy
    { roomId: lab2.id, day: DayOfWeek.MONDAY, startTime: '10:15', endTime: '11:45', subject: 'Eletrónica', teacher: 'Prof. Fernando Lopes' },
    { roomId: lab2.id, day: DayOfWeek.TUESDAY, startTime: '10:15', endTime: '11:45', subject: 'Multimédia', teacher: 'Prof. Ana Sousa' },
    { roomId: lab2.id, day: DayOfWeek.WEDNESDAY, startTime: '08:30', endTime: '10:00', subject: 'Eletrónica', teacher: 'Prof. Fernando Lopes' },
    { roomId: lab2.id, day: DayOfWeek.THURSDAY, startTime: '14:00', endTime: '15:30', subject: 'Multimédia', teacher: 'Prof. Ana Sousa' },
    { roomId: lab2.id, day: DayOfWeek.FRIDAY, startTime: '10:15', endTime: '11:45', subject: 'Eletrónica', teacher: 'Prof. Fernando Lopes' },

    // SALA 101
    { roomId: sala101.id, day: DayOfWeek.MONDAY, startTime: '08:30', endTime: '10:00', subject: 'Matemática', teacher: 'Prof. Maria Professora' },
    { roomId: sala101.id, day: DayOfWeek.MONDAY, startTime: '10:15', endTime: '11:45', subject: 'Português', teacher: 'Prof. Isabel Ferreira' },
    { roomId: sala101.id, day: DayOfWeek.TUESDAY, startTime: '08:30', endTime: '10:00', subject: 'Inglês', teacher: 'Prof. David Reis' },
    { roomId: sala101.id, day: DayOfWeek.WEDNESDAY, startTime: '08:30', endTime: '10:00', subject: 'Matemática', teacher: 'Prof. Maria Professora' },
    { roomId: sala101.id, day: DayOfWeek.THURSDAY, startTime: '10:15', endTime: '11:45', subject: 'Português', teacher: 'Prof. Isabel Ferreira' },
    { roomId: sala101.id, day: DayOfWeek.FRIDAY, startTime: '08:30', endTime: '10:00', subject: 'Inglês', teacher: 'Prof. David Reis' },

    // SALA 201
    { roomId: sala201.id, day: DayOfWeek.MONDAY, startTime: '14:00', endTime: '15:30', subject: 'Física', teacher: 'Prof. Jorge Almeida' },
    { roomId: sala201.id, day: DayOfWeek.TUESDAY, startTime: '10:15', endTime: '11:45', subject: 'Química', teacher: 'Prof. Sofia Nunes' },
    { roomId: sala201.id, day: DayOfWeek.WEDNESDAY, startTime: '14:00', endTime: '15:30', subject: 'Física', teacher: 'Prof. Jorge Almeida' },
    { roomId: sala201.id, day: DayOfWeek.THURSDAY, startTime: '08:30', endTime: '10:00', subject: 'Química', teacher: 'Prof. Sofia Nunes' },
    { roomId: sala201.id, day: DayOfWeek.FRIDAY, startTime: '14:00', endTime: '15:30', subject: 'Física', teacher: 'Prof. Jorge Almeida' },

    // SALA 202 — light schedule
    { roomId: sala202.id, day: DayOfWeek.TUESDAY, startTime: '14:00', endTime: '15:30', subject: 'Educação Visual', teacher: 'Prof. Paula Santos' },
    { roomId: sala202.id, day: DayOfWeek.THURSDAY, startTime: '14:00', endTime: '15:30', subject: 'Educação Visual', teacher: 'Prof. Paula Santos' },

    // AUDITÓRIO — very few events
    { roomId: auditorio.id, day: DayOfWeek.WEDNESDAY, startTime: '10:15', endTime: '11:45', subject: 'Palestra — Segurança Digital', teacher: 'Convidado' },
    { roomId: auditorio.id, day: DayOfWeek.FRIDAY, startTime: '14:00', endTime: '16:00', subject: 'Assembleia de Escola', teacher: 'Direção' },
  ];

  // Also add schedules that ensure the CURRENT day has some occupied and some free rooms
  const currentHour = today.getHours();
  const currentMinutes = today.getMinutes();

  // Add a schedule for current time to make at least one room occupied right now
  if (currentDay !== DayOfWeek.SUNDAY && currentDay !== DayOfWeek.SATURDAY) {
    const nowStart = `${String(currentHour).padStart(2, '0')}:00`;
    const nowEnd = `${String(currentHour + 1).padStart(2, '0')}:30`;
    scheduleData.push({
      roomId: sala101.id,
      day: currentDay,
      startTime: nowStart,
      endTime: nowEnd,
      subject: 'Aula em Curso (teste)',
      teacher: 'Prof. Maria Professora',
    });
  }

  for (const s of scheduleData) {
    await prisma.schedule.create({
      data: {
        ...s,
        institutionId: institution.id,
      },
    });
  }
  console.log('✅ Schedules created (' + scheduleData.length + ' entries)');

  console.log('\n🎉 Seed completed!\n');
  console.log('Login credentials:');
  console.log('  Admin:      admin@sgei.pt     / Admin@1234');
  console.log('  Technician: tecnico@sgei.pt   / Tech@1234');
  console.log('  Teacher:    professor@sgei.pt / Teacher@1234');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
