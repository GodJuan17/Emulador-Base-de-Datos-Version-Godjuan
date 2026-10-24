CREATE TABLE Estudiante (
  id INTEGER PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL
);

CREATE TABLE Curso (
  id INTEGER PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL
);

CREATE TABLE Periodo (
  id INTEGER PRIMARY KEY,
  etiqueta VARCHAR(40) NOT NULL
);

CREATE TABLE Inscripcion (
  estudiante_id INTEGER NOT NULL REFERENCES Estudiante(id),
  curso_id INTEGER NOT NULL REFERENCES Curso(id),
  periodo_id INTEGER NOT NULL REFERENCES Periodo(id),
  PRIMARY KEY (estudiante_id, curso_id, periodo_id)
);
