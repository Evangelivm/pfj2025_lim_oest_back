import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { WsGateway } from 'src/ws/ws.gateway';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'], // Opcional: logs para monitoreo
    });
  }

  async onModuleInit() {
    await this.$connect(); // Conexión con la base de datos
  }

  async onModuleDestroy() {
    await this.$disconnect(); // Cierra las conexiones al finalizar
  }

  // Método para obtener todos los participantes
  async getParticipantes() {
    const participantes = await this.$queryRaw<
      { id_part: number; name: string }[]
    >`SELECT id_part, CONCAT(apellidos, ', ', nombres) AS name FROM participante;`;

    console.log('Lista total consultada');
    return participantes;
  }

  // Método para obtener un participante por id_part
  async getParticipanteById(id: string) {
    const participante = await this.$queryRaw`
      SELECT 
        a.id_part, 
        b.compañia, 
        a.nombres, 
        a.apellidos, 
        c.habitacion, 
        a.edad, 
        d.estaca, 
        e.barrio 
      FROM participante a
      JOIN comp b ON a.\`compañia\` = b.comp_id
      JOIN habitacion c ON a.habitacion = c.habit_id
      JOIN estaca d ON a.estaca = d.est_id
      JOIN barrio e ON a.barrio = e.id_barrio
      WHERE a.id_part = ${id};
    `;

    const nombre = participante?.[0]?.nombres || 'Desconocido';
    const apellido = participante?.[0]?.apellidos || 'Desconocido';
    console.log(`Se consultó a ${nombre} ${apellido}`);

    return participante;
  }

  // Método para actualizar 'asistio' en la tabla asistencia
  async updateAsistencia(id: string) {
    const participante = await this.getParticipanteById(id); // Obtener el nombre

    // Ejecutamos la actualización de la asistencia
    await this.$executeRaw`
    UPDATE asistencia
    SET asistio = "Si"
    WHERE id_part = ${id};
  `;

    const nombre = participante?.[0]?.nombres || 'Desconocido';
    const apellido = participante?.[0]?.apellidos || 'Desconocido';
    console.log(`La asistencia de ${nombre} ${apellido} ha sido registrada`);

    return { message: 'Asistencia actualizada con éxito' };
  }
  async getSummaryByAge(edad: number) {
    return this.$queryRaw`
      SELECT 
        a.compañia, 
        SUM(CASE WHEN a.sexo = 'H' THEN 1 ELSE 0 END) AS hombres, 
        SUM(CASE WHEN a.sexo = 'M' THEN 1 ELSE 0 END) AS mujeres 
      FROM 
        participante a 
      JOIN 
        asistencia b 
      ON 
        a.id_part = b.id_part 
      WHERE 
        a.compañia IN (
          SELECT compañia 
          FROM participante 
          WHERE edad = ${edad}
        ) 
        AND a.tipo = 'participante' 
        AND b.asistio = 'Si' 
      GROUP BY 
        a.compañia 
      ORDER BY 
        hombres DESC, 
        mujeres DESC;
    `;
  }
  // PrismaService - Agregar nueva consulta para obtener estacas
  async getEstacas() {
    const estacas = await this.$queryRaw<
      { est_id: number; estaca: string }[]
    >`SELECT est_id, estaca FROM estaca;`;

    console.log('Estacas consultadas:', estacas);
    return estacas;
  }
  // Método para obtener barrios por estaca
  async getBarriosByEstaca(estacaId: string) {
    return this.$queryRaw`
      SELECT id_barrio, barrio 
      FROM barrio 
      WHERE estaca = ${estacaId};
    `;
  }
}