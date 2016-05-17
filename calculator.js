
/**
 * Класс калькулятора, он же конструктор
 * @class Calculator
 * @param {Object} options - Объект с настройками
 * @param {string} [options.selector=.calculator] - Селектор контейнера с калькулятором. Поиск полей будет вести в рамках контейнера.
 * @param {boolean} [options.populate_fields_data=true] - Заполнять аттрибуты data у полей. Полезно для слайдеров.
 * @param {boolean} [options.fix_values_on_blur=true] - Исправлять значения полей на событиях change и blur.
 * @param {function} options.onAfterCalc - Колбэк, вызывается сразу после расчёта (values, results)
 * @param {function} options.onBeforeCalc - Колбэк, вызывается перед расчётом (values)
 * @param {function} options.onBoundsChange - Колбэк, вызывается при изменении границ поля ()
 */
var Calculator = function(options) {
	options = $.extend({
		selector: '.calculator',
		populate_fields_data: true,
		fix_values_on_blur: true
	}, options);

	var self = this;

	this.options = options;
	this.fields = []; // Поля
	this.results = []; // Расчеты
	this.values = {}; // Значения
	this.conditions = []; // Условия
	this.forceChanged = false; // Если true — функция watch отработает так, будто данные были изменены

	var calcContainer = $(options.selector);
	this.calcContainer = calcContainer;

	this.doFixValues = false;

	if(typeof window.requestAnimationFrame != 'function'){
		window.requestAnimationFrame = function(callback){
			setTimeout(callback, 100);
		}
	}

	window.requestAnimationFrame(function(){
		self.watch(self);
	});
}

/**
 * Изменяет настройки калькулятора.
 * @type {function}
 * @memberof Calculator
 * @param {Object} options — Объект с настройками. см. конструктор
 */
Calculator.prototype.setOptions = function(options) {
	$.extend(this.options, options);
}

/**
 * Заставляет калькулятор пересчитать результат на следующей проверке
 * @type {function}
 * @memberof Calculator
 */
Calculator.prototype.forceChange = function() {
	this.forceChanged = true;
}

/**
 * Возвращает объект field по имени поля
 * @type {function}
 * @memberof Calculator
 * @param {string} name — Название поля
 */
Calculator.prototype.getFieldByName = function(name) {
	var result = false;
	$.each(this.fields, function(key, field){
		if(field.name == name){
			result = field;
			return false;
		}
	});
	return result;
}

/**
 * Добавляет новое поле в калькулятор
 * @param {Object} field - Объект с настройками поля
 * @param {string} field.title - Название поля (для читаемости)
 * @param {string} field.name - аттрибут name инпута, из которого нужно брать значение
 * @param {string} field.code - Код поля, используется в формулах.
 * @param {number} field.value - Значение поля по-умолчанию
 * @param {number|string|function} field.min - Минимальное значение поля. Также может быть строкой (формулой) или функцией
 * @param {number|string|function} field.max - Максимальное значение поля. Также может быть строкой (формулой) или функцией
 * Для формул, записанных в виде строки, первым символом должен быть знак "=".
 * Формулы используют код поля.
 * Пример формулы: '=(INV+DUR)/2', где INV - код одного поля, а DUR — код другого.
 * Этот же пример для функции: function(val){ return (val.INV + val.DUR) / 2; }
 */
Calculator.prototype.addField = function(field){
	var input = this.calcContainer.find('input[name="' + field.name + '"], select[name="' + field.name + '"], textarea[name="' + field.name + '"]');
	var self = this;

	if(input.length == 1){
		field._input = input.get(0);
	}

	if(typeof(field.min) == 'string' && field.min[0] == "="){
		field.min = this.parseFormula(field.min);
	}

	if(typeof(field.max) == 'string' && field.max[0] == "="){
		field.max = this.parseFormula(field.max);
	}

	if(typeof(field.value) == 'string' && field.value[0] == "="){
		field.value = this.parseFormula(field.value);
	}

	this.fields.push(field);

	if(typeof field.value == 'function'){
		this.values[field.code] = field.value(this.values);
	} else {
		this.values[field.code] = field.value;
	}

	input.on('change blur', function(){
		if(self.options.fix_values_on_blur){
			self.doFixValues = true;
		}
	});
}

/**
 * Добавляет новый параметр в калькулятор, параметр затем можно использовать в формуле.
 * Синоним для addField
 * @param {Object} field - Объект с настройками поля
 * @param {string} field.title - Название поля (для читаемости)
 * @param {string} field.code - Код поля, используется в формулах.
 * @param {number} field.value - Значение поля по-умолчанию
 */
Calculator.prototype.addParameter = function(field){
	this.addField(field);
}

/**
 * Добавляет условие в калькулятор. Условие нужно для дополнительных действий над полями.
 * Практически это коллбэк, который вызывается при каждом изменении значений.
 * Условия запускаются перед проверкой диапазонов.
 * Даёт возможность изменить значения полей и провести какие-то дополнительные действия над полями.
 * @param {function} func(values,fields) - Функция. На входе массив значений и массив полей.
 */
Calculator.prototype.addCondition = function(func){
	this.conditions.push(func);
}

/**
 * Пробегает по всем условиям и выполняет их.
 */
Calculator.prototype.runConditions = function(){
	var length = this.conditions.length;
	for(var i=0; i<length; i++){
		this.conditions[i](this.values, this.fields);
	}
}

/**
 * Добавляет новый расчет в калькулятор.
 * @param {Object} result - Объект с настройками расчета
 * @param {string} result.title - Название расчета (для читаемости)
 * @param {string|function} result.formula - Расчетная формула. Также может быть функцией
 * @param {function} result.format - Функция форматирования результата. Если не задана — то просто округление.
 * @param {string} result.selector - jQuery селектор, в который будет записан результат
 * @param {string} result.code - Код результата, аналогично коду поля. Позволяет использовать результат в расчёте другого результата.
 */
Calculator.prototype.addResult = function(result){
	var self = this;
	if(typeof result.formula != 'function'){
		result.formula = this.parseFormula(result.formula);
	}
	if(typeof result.format != 'function'){
		result.format = function(res){
			return self.toFixed(res, 0);
		}
	}
	result._output = $(result.selector);
	this.results.push(result);
}

/**
 * Преобразует текстовую формулу в функцию, возвращающую результат вычисления формулы.
 * @param {string} formula - формула. 
 */
Calculator.prototype.parseFormula = function(formula){
	if(formula[0] == "="){
		formula = formula.substring(1);
	}
	formula = formula.replace(/([A-Za-zА-Яа-я][A-Za-zА-Яа-я0-9]*)/g, 'values["$1"]');
	return function(values){
		return eval(formula);
	}
}

/**
 * Производит расчёты по всем формулам, записывает результаты в соответствующие места
 */
Calculator.prototype.calc = function(){
	var values = this.values;
	var self = this;
	var results = [];

	if(typeof this.options.onBeforeCalc == 'function'){
		this.options.onBeforeCalc(values);
	}

	$.each(this.results, function(key, result){
		var res = result.formula(values);
		var val = result.format(res);
		
		// Добавляем результат расчёта к списку значений, если у результата указан код
		// Таким образом результат можно использовать в расчёте другого результата
		if(result.code){
			values[result.code] = res;
		}

		result._output.each(function(){
			if($(this).is('input')){
				$(this).val(val);
			} else {
				$(this).html(val);
			}
		});
		results.push({ title: result.title, value: res, valueFormatted: val });
	});

	if(typeof this.options.onAfterCalc == 'function'){
		this.options.onAfterCalc(values, results);
	}
}

/**
 * Утилитарная функция, округляет до нужного кол-ва знаков
 * @param {double} value - Число
 * @param {number} precision - До скольких знаков округлять
 */
Calculator.prototype.toFixed = function(value, precision) {
    var power = Math.pow(10, precision || 0);
    return String(Math.round(value * power) / power);
}

/**
 * Утилитарная функция, разбивает число пробелами по 3 знака
 * @param {double} x - Число
 */
Calculator.prototype.numberWithSpaces = function(x) {
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/**
 * Возвращает минимальное и максимальное значения поля в виде объекта { min, max }
 * @param {object} field - Объект поля (см. addField)
 */
Calculator.prototype.getMinMax = function(field) {
	var min = field.min;
	var max = field.max;
	if(typeof min == 'function'){
		min = min(this.values);
	}
	if(typeof max == 'function'){
		max = max(this.values);
	}
	if(typeof min != 'undefined' && typeof max != 'undefined'){
		return { min: min, max: max};
	}
	return false;
}

/**
 * Возвращает значение поля
 * Для чекбоксов возвращает 1 или 0
 * Для селектов — текущее значение в виде строки
 * Для инпутов — приведённое к числу значение
 * @param {object} input - DOM-объект с инпутом
 */
Calculator.prototype.getValue = function(input) {
	if(input.getAttribute('type') == 'checkbox'){
		return input.checked ? 1 : 0;
	} else if(input.tagName == 'SELECT'){
		return input.value;
	} else {
		return parseFloat(input.value.replace(/[^0-9.,]/g, ''));
	}
}

/**
 * Проверяет, что значения во всех полях лежат внутри допустимых диапазонов.
 * Также пересчитывает значения для параметров со значением типа "формула".
 * Если нет — исправляет.
 */
Calculator.prototype.checkFieldBounds = function() {
	var length = this.fields.length;
	var boundschanged = false;
	for(var i=0; i<length; i++){
		var field = this.fields[i];

		var minmax = this.getMinMax(field);
		var valuechanged = false;

		// Для параметров со значением типа "формула" вычисляем текущее актуальное значение
		if(typeof field.value == 'function'){
			this.values[field.code] = field.value(this.values);
			continue;
		}
		
		if(!minmax)
			continue;

		if(field.lastmin != minmax.min || field.lastmax != minmax.max){
			boundschanged = true;
			field.lastmin = minmax.min;
			field.lastmax = minmax.max;
		}

		if(this.values[field.code] < minmax.min){
			// Значение меньше допустимого
			this.values[field.code] = minmax.min;
			valuechanged = true;
		}
		if(this.values[field.code] > minmax.max){
			// Значение больше допустимого
			this.values[field.code] = minmax.max;
			valuechanged = true;
		}

		if(valuechanged) {
			$(field._input).addClass('calculator__field_error');
		} else {
			$(field._input).removeClass('calculator__field_error');
		}

		if(this.options.populate_fields_data){
			field._input.setAttribute('data-min', minmax.min);
			field._input.setAttribute('data-max', minmax.max);
			field._input.setAttribute('data-value', this.values[field.code]);
		}
	}
	if(boundschanged && typeof this.options.onBoundsChange == 'function'){
		this.options.onBoundsChange();
	}
}

/**
 * Исправляет значения инпутов с ошибкой.
 */
Calculator.prototype.fixValues = function() {
	var self = this;
	//self.checkFieldBounds();
	$.each(self.fields, function(key, field){
		if($(field._input).is('.calculator__field_error')){
			$(field._input).val(self.values[field.code]);
			$(field._input).removeClass('calculator__field_error');
		}
	});
}


/**
 * Заполняет аттрибуты data-min, data-max и data-value у полей.
 * Имеет смысл запускать после того, как добавлены все поля.
 */
Calculator.prototype.populateFieldsData = function() {
	var length = this.fields.length;
	for(var i=0; i<length; i++){
		var field = this.fields[i];
		var minmax = this.getMinMax(field);
		
		if(!minmax)
			continue;

		field._input.setAttribute('data-min', minmax.min);
		field._input.setAttribute('data-max', minmax.max);
		field._input.setAttribute('data-value', this.values[field.code]);
	}
}

/**
 * Следит за изменением переменных. Запускается зилиард раз в секунду.
 */
Calculator.prototype.watch = function(self){
	var length = self.fields.length;
	var changed = false;
	for(var i=0; i<length; i++){
		var field = self.fields[i];
		if(field._input && self.values[field.code] != self.getValue(field._input)) {
			self.values[field.code] = self.getValue(field._input);
			changed = true;

			if(self.options.populate_fields_data){
				field._input.setAttribute('data-value', self.values[field.code]);
			}
		}
	}
	if(changed || self.forceChanged){
		self.forceChanged = false;
		self.runConditions();
		self.checkFieldBounds();
		self.calc();
	}
	/** Починка значений инпутов выполняется в рамках общего цикла по запросу, иначе значения могут быть неактуальными */
	if(self.doFixValues){
		self.doFixValues = false;
		self.fixValues();
	}

	window.requestAnimationFrame(function(){
		self.watch(self);
	});
}