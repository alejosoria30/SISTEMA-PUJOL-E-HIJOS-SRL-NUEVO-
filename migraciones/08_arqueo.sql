CREATE TABLE IF NOT EXISTS arqueos_pos (
 idTurno INT PRIMARY KEY,
 idUsu INT NOT NULL,
 billetes JSON NOT NULL,
 otros DECIMAL(10,2) NOT NULL,
 observaciones VARCHAR(500) NOT NULL,
 FOREIGN KEY(idTurno) REFERENCES caja_turnos(idTurno),
 FOREIGN KEY(idUsu) REFERENCES usuario(idUsu)
) ENGINE=InnoDB;
