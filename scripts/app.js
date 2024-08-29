class Producto {
  constructor(
    nombre = "",
    descripcion = "",
    precio = 0,
    stock = 0,
    descuento = 0
  ) {
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.precio = precio;
    this.stock = stock;
    this.descuento = descuento;
  }
}

class Categoria {
  constructor(nombre = "", productos /*array de Producto*/, subCategorias /*array de Categoria*/) {
    this.nombre = nombre;
    this.productos = productos;
    this.subCategorias = subCategorias;
  }
}

class Store {
  constructor(categorias /*array de Categoria*/, carrito /*array de Producto*/) {   
    this.categorias = categorias;
    this.carrito = carrito;
  }
}

const openInterface = document.getElementById("temp-ui");

openInterface.addEventListener("click", runStore);

function runStore() {
  let tienda = loadStore();
  alert("¡Bienvenido a mi Regaleria!\nPara interacturar utilizará los números de su teclado.\nA continuación se le mostrarán opciones.");
  mainLoop(tienda);
}
// runStore();

function loadStore() {
  // debugger
  const allCategories = generateCategories();
  const tienda = new Store(allCategories, []);
  return tienda;
}
// loadStore()

function mainLoop(tienda){
  let opcion; 
  do {
    opcion = menu();
    switch (opcion) {
      case 1: {
        tienda = exploreMainCategories(tienda);
        break;
      }
      case 2: {
        tienda = cartMenu(tienda);
        break;
      }
      case 3: {
        alert("Terminamos por hoy\n¡Que tenga buen día!")
        break;
      }
    }
  } while (opcion != 3)

}

function menu() {
  const message = "=== Menu Principal ===\n1: Explorar Productos.\n2: Ver Carrito.\n3: Terminar Sesión.";
  return inputInt(message, 1, 3);
}

function cartMenu(tienda) {
  // debugger;
  let message = "=== Carrito ===\n";
  if (tienda.carrito.length === 0){
    message += "¡No hay nada en el carrito!"
    alert(message);
    return tienda;
  }
  let totalPrice = 0;
  tienda.carrito.forEach((producto, indice) => {
    totalPrice += producto.precio;
    message += ++indice + ": " + producto.nombre + " | $" + producto.precio + "\n"
  });
  message += `======\nTotal: $${totalPrice.toFixed(2)}\n¿Que deséa hacer?\n0: 🔙 Volver\n1: Eliminar Producto\n2: Hacer Compra`;
  let opcion = inputInt(message, 0, 2);

  switch (opcion){
    case 0: {
      return tienda;
    }
    case 1: {
      return deleteProductFromCart(tienda);
    }
    case 2: {
      return finishPurchase(tienda);
    }
  }
}

function deleteProductFromCart(tienda){
  // debugger;
  let message = "=== ¿Cual desea eliminar? ===\n0: 🔙 Volver\n"
  tienda.carrito.forEach((producto, indice) =>
    message += ++indice + ": " + producto.nombre + " | $" + producto.precio + "\n"
  );

  let eliminate = inputInt(message, 0, tienda.carrito.length);
  if (eliminate === 0)
    return tienda;

  eliminate--;
  let nombre = tienda.carrito[eliminate].nombre;

  tienda.carrito.splice(eliminate, 1);
  alert(`Se elimino ${nombre} del carrito`);

  return tienda;
}

function finishPurchase(tienda) {
  let total = 0;

  let message = "¡Se completó tu compra!\n"
  tienda.carrito.forEach(producto => {
    message += producto.nombre + " | $" + producto.precio + "\n";
    total += producto.precio;
  })

  tienda.carrito = [];
  message += "Total de la compra: $" + total.toFixed(2);
  alert(message);  
  return tienda;
}


function exploreMainCategories(tienda){
  // debugger;
  const categorias = tienda.categorias;
  if (categorias.length <= 0){
    alert("¡Vaya! No hay nada que mostrar 😅");
    return tienda;
  }

  let message = "=== Categorías de Productos ===\n0: 🔙 Volver\n";
  getCategoriesNames(categorias).forEach((nombresCategorias, index) =>
    message += ++index + ": " + nombresCategorias + "\n"
  );

  let categorySelected = inputInt(message, 0 , categorias.length);
  if (categorySelected === 0)
    return tienda;

  categorySelected--;
  return exploreCategory(categorias[categorySelected], tienda);
}

function exploreCategory(categoria, tienda){
  // debugger
  let totalProducts = categoria.productos != undefined ? categoria.productos.length : 0;
  const totalSubcategories = categoria.subCategorias != undefined ? categoria.subCategorias.length : 0;
  if (totalProducts == 0 && totalSubcategories == 0 ){
    alert("¡Vaya! No hay nada que mostrar 😅");
    return tienda;
  }

  let messageProducts = messageSubcategories = "";
  if (totalProducts > 0)
    [messageProducts, totalProducts] = selectProduct(categoria);

  if (totalSubcategories > 0) {
    messageSubcategories = "=== Subcategorias de " + categoria.nombre + " ===\n";
    if (totalProducts === 0)
      messageSubcategories += "0: 🔙 Volver\n"

    getCategoriesNames(categoria.subCategorias).forEach((categoryName, index) => 
      messageSubcategories += (index + totalProducts + 1) + ": " + categoryName + "\n"
    );
  }

  let message = messageProducts + messageSubcategories;
  let option = inputInt(message, 0, totalProducts + totalSubcategories)

  if (option === 0)
    return tienda;
  if (option <= totalProducts) {
    return productMenu(categoria.productos[option - 1], tienda); // -1 es para corregir para obtener el indice del producto
  } else { 
    return exploreCategory(categoria.subCategorias[option - 1], tienda);
  }
}

function selectProduct(categoria /* recibe Categoria */) {
  // debugger
  if (categoria.productos.length === 0)
    return ["", 0];
  
  let message = `=== Productos de: ${categoria.nombre} ===\n¿Que producto desea ver?\n0: 🔙 Volver\n`; 

  categoria.productos.forEach((producto, index) =>
    message += ++index + ": " + producto.nombre + " | $" + producto.precio + " | Stock: " + producto.stock + "\n"
  );

  return [message, categoria.productos.length];
  // let selectedProduct = inputInt(message, 0 , categoria.productos.length);
}

function productMenu(producto, tienda){
  let message = "=== " + producto.nombre + " ===\nDescripción: " + producto.descripcion + "\nPrecio: $" + producto.precio +
                "\n¿Que desea hacer con este producto?\n0: 🔙 Volver\n1: Añadirlo al carrito";
  const option = inputInt(message, 0, 1);
  if (option === 0)
    return tienda;

  tienda.carrito.push(producto);
  alert(`Se añadió ${producto.nombre} por $${producto.precio} al carrito.`);
  return tienda;
}


function inputInt(message, min, max){
  let input = parseInt(prompt(message));
  while (isNaN(input) || input < min || input > max) 
    input = parseInt(prompt("Ups... botón equivocado. Intentalo otra vez.\n" + message));
  return input;
}


function getCategoriesNames(categorias /* array de Categoria */){
  // debugger
  let products = [];
  if (categorias.length <= 0)
    return products;

  for (const categoria of categorias)
    products.push(categoria.nombre);

  return products;
}

// generar los productos y categorias
function generateCategories(){
  return [generateChildrenToys(), generateStationery(), generateFlowersAndPlants(), generateDecoration(), generateClothingAndAccesories()];
}

function generateChildrenToys() {
  //generar subcategoria Juguetes para Niños/as para la categoria de Juguetes
  const juguete1 = new Producto("Lego Classic", "Set de bloques de construcción clásico para estimular la creatividad y la imaginación.", 12500.0, 50);
  const juguete2 = new Producto("Muñeca Barbie", "Muñeca Barbie con accesorios y ropa intercambiable.", 8500.0, 30);
  const juguete3 = new Producto("Coche de Carreras Hot Wheels", "Vehículo de juguete a escala con diseño deportivo para carreras emocionantes.", 4000.0, 100);
  const juguete4 = new Producto("Pizarra Mágica", "Pizarra magnética para dibujar y borrar fácilmente, ideal para niños creativos.", 15000.0, 75);
  const juguete5 = new Producto("Puzzle de Animales", "Rompecabezas educativo de 24 piezas con ilustraciones de animales.", 4100.0, 40);

  //generar subcategoria Peluches para la categoria de Juguetes
  const peluche1 = new Producto("Peluche Oso Panda", "Suave peluche en forma de oso panda, ideal para abrazar y decorar.", 5000.0, 60);
  const peluche2 = new Producto("Peluche Unicornio", "Peluche de unicornio con crin colorida y cuerno brillante.", 5000.0, 45);
  const peluche3 = new Producto("Peluche Elefante", "Tierno peluche de elefante con orejas grandes y cuerpo esponjoso.", 5000.0, 80);
  const peluche4 = new Producto("Peluche Dinosaurio", "Peluche de dinosaurio con detalles realistas y textura suave.", 5000.0, 70);
  const peluche5 = new Producto("Peluche Gato", "Peluche de gato con ojos grandes y pelaje suave, perfecto para niños y adultos.", 5000.0, 50);

  const juguetes = new Categoria("Juguetes para Niños/as", [juguete1,juguete2, juguete3, juguete4, juguete5]);  // console.log(juguetes);
  const peluches = new Categoria("Peluches", [peluche1, peluche2, peluche3, peluche4, peluche5]);  // console.log(peluches);
 
  return new Categoria("Juguetes", [], [juguetes, peluches]);
}
// console.log(generateChildrenToys());

function generateStationery(){
  const cajaRegalo1 = new Producto("Caja de Regalo Pequeña - 15x10x5 cm", "Elegante caja de regalo de tamaño pequeño, ideal para joyería y pequeños recuerdos. Dimensiones: 15x10x5 cm.", 5.99, 100);
  const cajaRegalo2 = new Producto("Caja de Regalo Mediana - 25x20x10 cm", "Caja de regalo de tamaño mediano con un diseño clásico, perfecta para libros y artículos de tamaño moderado. Dimensiones: 25x20x10 cm.", 9.99, 75);
  const cajaRegalo3 = new Producto("Caja de Regalo Grande - 40x30x15 cm", "Gran caja de regalo con acabado lujoso, ideal para ropa o varios artículos grandes. Dimensiones: 40x30x15 cm.", 14.99, 50);

  const tarjeta1 = new Producto("Tarjeta de Cumpleaños - Flores y Globo", "Tarjeta de felicitación con diseño de flores y globo, ideal para cumpleaños. Incluye sobre.", 2.99, 200);
  const tarjeta2 = new Producto("Tarjeta de Felicitaciones - Bebé Recién Nacido", "Tierna tarjeta con ilustraciones de bebé y juguetes, perfecta para felicitar por la llegada de un nuevo miembro a la familia.", 3.49, 150);
  const tarjeta3 = new Producto("Tarjeta de Aniversario - Corazones y Oro", "Elegante tarjeta con detalles dorados y corazones, ideal para celebrar aniversarios. Incluye sobre decorativo.", 4.99, 100);
  const tarjeta4 = new Producto("Tarjeta de Graduación - Toga y Birrete", "Tarjeta de felicitaciones con diseño de toga y birrete, perfecta para graduaciones. Incluye espacio para mensaje personal.", 3.99, 120);

  const cajas = new Categoria("Cajas de Regalo", [cajaRegalo1, cajaRegalo2, cajaRegalo3]); //console.log(cajas);
  const tarjetas = new Categoria("Tarjetas de Felicitación", [tarjeta1, tarjeta2, tarjeta3, tarjeta4]); //console.log(tarjetas);

  return new Categoria("Papelería", [], [cajas, tarjetas]);
}
// console.log(generateStationery());

function generateFlowersAndPlants() {
  const flor1 = new Producto("Ramo de Rosas Rojas", "Hermoso ramo de 12 rosas rojas frescas, ideal para ocasiones románticas. Las rosas están cuidadosamente seleccionadas para asegurar su calidad y frescura.", 24.99, 30);
  const flor2 = new Producto("Orquídea Blanca en Maceta", "Elegante orquídea blanca en una maceta decorativa, perfecta para regalar o decorar interiores. Esta planta es conocida por su durabilidad y belleza exótica.", 34.99, 20);

  const planta1 = new Producto("Palo de Brasil", "Planta de interior de fácil cuidado con hojas largas y verdes. Ideal para purificar el aire y decorar espacios. Altura aproximada: 60 cm.", 22.99, 40);
  const planta2 = new Producto("Sukulentas Variadas", "Colección de 4 suculentas diferentes en macetas pequeñas. Perfectas para el hogar o oficina, requieren poco riego y mantenimiento. Cada planta mide entre 5-10 cm.", 15.99, 60);
  const planta3 = new Producto("Planta de Lavanda en Maceta", "Planta de lavanda con fragancia natural, ideal para aromatizar interiores o jardines. Maceta incluida. Altura aproximada: 30 cm.", 18.49, 35);
  const planta4 = new Producto("Helecho de Boston", "Helecho de Boston con hojas frondosas y verdes. Excelente para interiores con buena humedad. Altura aproximada: 45 cm. Incluye maceta decorativa.", 27.99, 25);
  
  const flowers = new Categoria("Ramos de Flores", [flor1, flor2]); //console.log(flowers);
  const plants  = new Categoria("Plantas", [planta1, planta2, planta3, planta4]); //console.log(plants);

  return new Categoria("Flores y Plantas", [], [flowers, plants]);
}
// console.log(generateFlowersAndPlants());

function generateDecoration(){
  const accesorio1 = new Producto("Alfombra Moderna - 120x80 cm", "Alfombra moderna de diseño abstracto en tonos neutros, ideal para salones o habitaciones. Material suave y fácil de limpiar.", 49.99, 20);
  const accesorio2 = new Producto("Lámpara de Mesa con Base de Madera", "Lámpara de mesa elegante con base de madera y pantalla de lino. Perfecta para iluminar escritorios o mesas de noche.", 34.99, 25);
  const accesorio3 = new Producto("Reloj de Pared Retro", "Reloj de pared con diseño retro en estilo vintage, ideal para decorar cualquier habitación. Funciona con baterías.", 29.99, 15);
  const accesorio4 = new Producto("Cojines Decorativos - Set de 2", "Set de 2 cojines decorativos con fundas de algodón en colores vivos. Perfectos para añadir un toque de color y confort a tu sofá.", 22.99, 30);
  const accesorio5 = new Producto("Espejo de Pared con Marco Dorado", "Espejo de pared con marco dorado elegante, ideal para decorar pasillos o salas de estar. Dimensiones: 60x40 cm.", 59.99, 10);
  const accesorio6 = new Producto("Portavelas de Cristal", "Portavelas de cristal con diseño elegante y moderno. Ideal para crear un ambiente acogedor en cualquier habitación. Incluye velas.", 14.99, 40);

  const houseAccesories = new Categoria("Accesorios para el Hogar", [accesorio1, accesorio2, accesorio3, accesorio4, accesorio5, accesorio6]); // console.log(houseAccesories);
  
  return new Categoria("Decoración", [], [houseAccesories]);
}
// console.log(generateDecoration());

function generateClothingAndAccesories() {
  const arito1 = new Producto("Aritos de Plata con Zirconia", "Aritos de plata esterlina con piedras de zirconia cúbica, diseño clásico y elegante. Ideal para el uso diario o ocasiones especiales.", 29.99, 50);
  const arito2 = new Producto("Aritos de Oro Rosa - 18K", "Aritos de oro rosa de 18 quilates con un acabado pulido. Diseño moderno y sofisticado, perfecto para combinar con cualquier atuendo.", 79.99, 25);
  const arito3 = new Producto("Aritos de Acero Inoxidable con Perla", "Aritos de acero inoxidable con perlas falsas, ofreciendo un look chic y duradero. Resistente al agua y a la corrosión, ideal para el uso diario.", 15.99, 75);

  const collar1 = new Producto("Collar de Plata con Colgante de Corazón", "Elegante collar de plata esterlina con colgante en forma de corazón. Perfecto para ocasiones románticas y como regalo especial. Longitud de cadena: 45 cm.", 39.99, 30);
  const collar2 = new Producto("Collar de Oro con Perlas Naturales", "Collar de oro de 18 quilates con perlas naturales. Diseño clásico y sofisticado, ideal para eventos formales y ocasiones especiales. Longitud de cadena: 50 cm.", 129.99, 20);

  const sombrero1 = new Producto("Sombrero de Paja - Estilo Panamá", "Sombrero de paja estilo Panamá, ligero y ventilado, ideal para protegerse del sol durante el verano. Talla ajustable.", 29.99, 40);
  const sombrero2 = new Producto("Sombrero de Lana - Fedora", "Sombrero de lana en estilo Fedora, elegante y cálido, perfecto para el otoño e invierno. Disponible en varios colores. Talla única.", 49.99, 25);
  const sombrero3 = new Producto("Gorra Deportiva - Ajustable", "Gorra deportiva de algodón con visera curva y ajuste trasero. Ideal para actividades al aire libre y deportes. Disponible en varios colores.", 19.99, 60);

  const mochila1 = new Producto("Mochila de Senderismo - 30L", "Mochila de senderismo de 30 litros con múltiples compartimentos y correas acolchadas para mayor comodidad. Ideal para excursiones y caminatas.", 69.99, 25);
  const mochila2 = new Producto("Mochila Escolar - Diseño Juvenil", "Mochila escolar con diseño juvenil y colorido, ideal para estudiantes. Incluye varios compartimentos y correas ajustables. Dimensiones: 40x30x15 cm.", 34.99, 40);
  const mochila3 = new Producto("Mochila de Laptop - 15.6 pulgadas", "Mochila para laptop con compartimento acolchado para computadoras de hasta 15.6 pulgadas. Diseñada para el trabajo o estudios, con múltiples bolsillos para accesorios.", 59.99, 30);
  const mochila4 = new Producto("Mochila Casual - Cuero Sintético", "Mochila casual de cuero sintético con un diseño elegante y moderno. Ideal para uso diario y ocasiones informales. Dimensiones: 35x25x10 cm.", 49.99, 20);

  const cartera1 = new Producto("Cartera de Cuero - Clásica", "Cartera de cuero genuino con compartimentos para tarjetas y billetes. Diseño clásico y elegante, disponible en varios colores. Dimensiones: 20x10 cm.", 79.99, 15);
  const cartera2 = new Producto("Cartera de Tela - Compacta", "Cartera compacta de tela con diseño moderno y práctico. Incluye compartimentos para tarjetas y monedas. Ideal para uso diario. Dimensiones: 15x9 cm.", 24.99, 40);

  const earrings = new Categoria("Aritos", [arito1, arito2, arito3]);
  const necklaces = new Categoria("Collares", [collar1, collar2]);
  const hats = new Categoria("Sombreros", [sombrero1, sombrero2, sombrero3]);
  const backpacks = new Categoria("Mochilas", [mochila1, mochila2, mochila3, mochila4]);
  const handbags = new Categoria("Carteras", [cartera1, cartera2]);

  return new Categoria("Ropa y Accesorios", [], [earrings, necklaces, hats, backpacks, handbags]);
}
// console.log(generateClothingAndAccesories());