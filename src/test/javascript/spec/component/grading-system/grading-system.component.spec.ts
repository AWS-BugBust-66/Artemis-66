import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GradingSystemComponent } from 'app/grading-system/grading-system.component';
import { GradingSystemService } from 'app/grading-system/grading-system.service';
import { ArtemisTestModule } from '../../test.module';
import { GradeType, GradingScale } from 'app/entities/grading-scale.model';
import { AlertComponent } from 'app/shared/alert/alert.component';
import { MockComponent, MockDirective, MockModule, MockPipe } from 'ng-mocks';
import { DeleteButtonDirective } from 'app/shared/delete-dialog/delete-button.directive';
import { MockTranslateService, TranslateTestingModule } from '../../helpers/mocks/service/mock-translate.service';
import { ArtemisTranslatePipe } from 'app/shared/pipes/artemis-translate.pipe';
import { AlertErrorComponent } from 'app/shared/alert/alert-error.component';
import { GradingSystemInfoModalComponent } from 'app/grading-system/grading-system-info-modal/grading-system-info-modal.component';
import { FormsModule } from '@angular/forms';
import { GradeStep } from 'app/entities/grade-step.model';
import { cloneDeep } from 'lodash-es';
import { of } from 'rxjs';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateService } from '@ngx-translate/core';
import { Exam } from 'app/entities/exam.model';
import { Course } from 'app/entities/course.model';
import { ExamManagementService } from 'app/exam/manage/exam-management.service';
import { ExportToCsv } from 'export-to-csv';

const generateCsv = jest.fn();

jest.mock('export-to-csv', () => ({
    ExportToCsv: jest.fn().mockImplementation(() => ({
        generateCsv,
    })),
}));

describe('Grading System Component', () => {
    let comp: GradingSystemComponent;
    let fixture: ComponentFixture<GradingSystemComponent>;
    let gradingSystemService: GradingSystemService;
    let translateService: TranslateService;
    let translateStub: jest.SpyInstance;
    let examService: ExamManagementService;

    const route = { params: of({ courseId: 1, examId: 1 }) } as any as ActivatedRoute;

    const gradeStep1: GradeStep = {
        gradeName: 'Fail',
        lowerBoundPercentage: 0,
        upperBoundPercentage: 40,
        lowerBoundInclusive: true,
        upperBoundInclusive: false,
        isPassingGrade: false,
    };
    const gradeStep2: GradeStep = {
        gradeName: 'Pass',
        lowerBoundPercentage: 40,
        upperBoundPercentage: 80,
        lowerBoundInclusive: true,
        upperBoundInclusive: false,
        isPassingGrade: true,
    };
    const gradeStep3: GradeStep = {
        gradeName: 'Excellent',
        lowerBoundPercentage: 80,
        upperBoundPercentage: 100,
        lowerBoundInclusive: true,
        upperBoundInclusive: true,
        isPassingGrade: true,
    };
    const gradeSteps = [gradeStep1, gradeStep2, gradeStep3];

    const exam = new Exam();
    exam.maxPoints = 100;
    const course = new Course();
    course.maxPoints = 100;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [ArtemisTestModule, TranslateTestingModule, MockModule(FormsModule), RouterTestingModule.withRoutes([])],
            declarations: [
                GradingSystemComponent,
                MockComponent(AlertComponent),
                MockComponent(AlertErrorComponent),
                MockComponent(GradingSystemInfoModalComponent),
                MockDirective(DeleteButtonDirective),
                MockPipe(ArtemisTranslatePipe),
            ],
            providers: [
                { provide: ActivatedRoute, useValue: route },
                { provide: Router, useValue: route },
                { provide: TranslateService, useClass: MockTranslateService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GradingSystemComponent);
        comp = fixture.componentInstance;

        gradingSystemService = TestBed.inject(GradingSystemService);
        examService = TestBed.inject(ExamManagementService);
        translateService = TestBed.inject(TranslateService);
    });

    beforeEach(() => {
        comp.gradingScale = new GradingScale();
        comp.gradingScale.gradeSteps = cloneDeep(gradeSteps);
        comp.courseId = 123;
        comp.examId = 456;
        comp.firstPassingGrade = 'Pass';
        translateStub = jest.spyOn(translateService, 'instant');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should handle find response for exam', () => {
        const findGradingScaleForExamStub = jest
            .spyOn(gradingSystemService, 'findGradingScaleForExam')
            .mockReturnValue(of(new HttpResponse<GradingScale>({ body: comp.gradingScale })));
        const findExamStub = jest.spyOn(examService, 'find').mockReturnValue(of(new HttpResponse<Exam>({ body: exam })));

        fixture.detectChanges();

        expect(comp).not.toBe(undefined);
        expect(comp.isExam).toBe(true);
        expect(findGradingScaleForExamStub).toHaveBeenNthCalledWith(1, 1, 1);
        expect(findGradingScaleForExamStub).toHaveBeenCalledTimes(1);
        expect(findExamStub).toHaveBeenCalledTimes(1);
        expect(comp.exam).toStrictEqual(exam);
        expect(comp.maxPoints).toBe(exam.maxPoints);
    });

    it('should handle find response for exam and not find a grading scale', () => {
        const findGradingScaleForExamAndReturnNotFoundStub = jest
            .spyOn(gradingSystemService, 'findGradingScaleForExam')
            .mockReturnValue(of(new HttpResponse<GradingScale>({ status: 404 })));

        fixture.detectChanges();

        expect(findGradingScaleForExamAndReturnNotFoundStub).toHaveBeenNthCalledWith(1, 1, 1);
        expect(findGradingScaleForExamAndReturnNotFoundStub).toHaveBeenCalledTimes(1);
    });

    it('should generate default grading scale', () => {
        comp.generateDefaultGradingScale();

        expect(comp.gradingScale.gradeType).toStrictEqual(GradeType.GRADE);
        expect(comp.firstPassingGrade).toStrictEqual('4.0');
        expect(comp.lowerBoundInclusivity).toBe(true);
        expect(comp.gradingScale.gradeSteps).toHaveLength(13);
        comp.gradingScale.gradeSteps.forEach((gradeStep) => {
            expect(gradeStep.id).toBe(undefined);
            expect(gradeStep.gradeName).not.toBe(undefined);
            expect(gradeStep.lowerBoundInclusive).toBe(true);
            expect(gradeStep.lowerBoundPercentage).toBeWithin(0, 101);
            expect(gradeStep.upperBoundPercentage).toBeWithin(0, 101);
            expect(gradeStep.lowerBoundPercentage).toBeLessThanOrEqual(gradeStep.upperBoundPercentage);
            if (gradeStep.upperBoundPercentage === 100) {
                expect(gradeStep.upperBoundInclusive).toBe(true);
            } else {
                expect(gradeStep.upperBoundInclusive).toBe(false);
            }
            if (gradeStep.lowerBoundPercentage >= 50) {
                expect(gradeStep.isPassingGrade).toBe(true);
            }
        });
    });

    it('should delete grade step', () => {
        comp.deleteGradeStep(1);

        expect(comp.gradingScale.gradeSteps).toHaveLength(2);
        expect(comp.gradingScale.gradeSteps).not.toContain(gradeStep2);
    });

    it('should create grade step', () => {
        comp.lowerBoundInclusivity = true;

        comp.createGradeStep();

        expect(comp.gradingScale.gradeSteps).toHaveLength(4);
        expect(comp.gradingScale.gradeSteps[3].id).toBe(undefined);
        expect(comp.gradingScale.gradeSteps[3].gradeName).toStrictEqual('');
        expect(comp.gradingScale.gradeSteps[3].lowerBoundPercentage).toBe(100);
        expect(comp.gradingScale.gradeSteps[3].upperBoundPercentage).toBe(100);
        expect(comp.gradingScale.gradeSteps[3].isPassingGrade).toBe(true);
        expect(comp.gradingScale.gradeSteps[3].lowerBoundInclusive).toBe(true);
        expect(comp.gradingScale.gradeSteps[3].upperBoundInclusive).toBe(true);
    });

    it('should delete grade names correctly', () => {
        comp.deleteGradeNames();

        comp.gradingScale.gradeSteps.forEach((gradeStep) => {
            expect(gradeStep.gradeName).toStrictEqual('');
        });
    });

    it('should filter grade steps with empty names correctly', () => {
        comp.gradingScale.gradeSteps[0].gradeName = '';
        comp.gradingScale.gradeSteps[2].gradeName = '';

        const filteredGradeSteps = comp.gradeStepsWithNonemptyNames();

        expect(filteredGradeSteps).toHaveLength(1);
        expect(filteredGradeSteps[0]).toStrictEqual(gradeStep2);
    });

    it('should set passing Grades correctly', () => {
        comp.firstPassingGrade = 'Fail';

        comp.setPassingGrades(comp.gradingScale.gradeSteps);

        comp.gradingScale.gradeSteps.forEach((gradeStep) => {
            expect(gradeStep.isPassingGrade).toBe(true);
        });

        comp.firstPassingGrade = '';

        comp.setPassingGrades(comp.gradingScale.gradeSteps);

        comp.gradingScale.gradeSteps.forEach((gradeStep) => {
            expect(gradeStep.isPassingGrade).toBe(false);
        });
    });

    it('should determine first passing grade correctly', () => {
        comp.determineFirstPassingGrade();

        expect(comp.firstPassingGrade).toStrictEqual('Pass');
    });

    it('should set inclusivity correctly', () => {
        comp.lowerBoundInclusivity = false;

        comp.setInclusivity(comp.gradingScale.gradeSteps);

        comp.gradingScale.gradeSteps.forEach((gradeStep) => {
            expect(gradeStep.upperBoundInclusive).toBe(true);
            if (gradeStep.lowerBoundPercentage === 0) {
                expect(gradeStep.lowerBoundInclusive).toBe(true);
            } else {
                expect(gradeStep.lowerBoundInclusive).toBe(false);
            }
        });
    });

    it('should set inclusivity correctly for grade step where lowerBound=upperBound', () => {
        comp.lowerBoundInclusivity = false;

        comp.gradingScale.gradeSteps.push({
            gradeName: 'Super Excellent',
            lowerBoundPercentage: 100,
            upperBoundPercentage: 100,
            lowerBoundInclusive: true,
            upperBoundInclusive: true,
            isPassingGrade: true,
        });

        comp.setInclusivity(comp.gradingScale.gradeSteps);

        comp.gradingScale.gradeSteps.forEach((gradeStep) => {
            expect(gradeStep.upperBoundInclusive).toBe(true);
            if (gradeStep.lowerBoundPercentage === 0) {
                expect(gradeStep.lowerBoundInclusive).toBe(true);
            } else {
                expect(gradeStep.lowerBoundInclusive).toBe(false);
            }
        });
    });

    it('should determine lower bound inclusivity correctly', () => {
        comp.setBoundInclusivity();

        expect(comp.lowerBoundInclusivity).toBe(true);
    });

    it('should not delete non-existing grading scale', () => {
        comp.existingGradingScale = false;
        const gradingSystemDeleteForCourseSpy = jest.spyOn(gradingSystemService, 'deleteGradingScaleForCourse');
        const gradingSystemDeleteForExamSpy = jest.spyOn(gradingSystemService, 'deleteGradingScaleForExam');

        comp.delete();

        expect(gradingSystemDeleteForCourseSpy).toHaveBeenCalledTimes(0);
        expect(gradingSystemDeleteForExamSpy).toHaveBeenCalledTimes(0);
    });

    it('should delete grading scale for course', () => {
        comp.existingGradingScale = true;
        comp.isExam = false;
        comp.courseId = 123;
        const gradingSystemDeleteForCourseStub = jest.spyOn(gradingSystemService, 'deleteGradingScaleForCourse').mockReturnValue(of(new HttpResponse<{}>({ body: [] })));

        comp.delete();

        expect(gradingSystemDeleteForCourseStub).toHaveBeenNthCalledWith(1, comp.courseId);
        expect(gradingSystemDeleteForCourseStub).toHaveBeenCalledTimes(1);
        expect(comp.existingGradingScale).toBe(false);
    });

    it('should delete grading scale for exam', () => {
        comp.existingGradingScale = true;
        comp.isExam = true;
        const gradingSystemDeleteForExamStub = jest.spyOn(gradingSystemService, 'deleteGradingScaleForExam').mockReturnValue(of(new HttpResponse<{}>({ body: [] })));

        comp.delete();

        expect(gradingSystemDeleteForExamStub).toHaveBeenNthCalledWith(1, comp.courseId, comp.examId);
        expect(gradingSystemDeleteForExamStub).toHaveBeenCalledTimes(1);
        expect(comp.existingGradingScale).toBe(false);
    });

    it('should not update grading scale', () => {
        comp.existingGradingScale = false;
        comp.isExam = false;
        comp.course = course;
        const gradingSystemServiceStub = jest.spyOn(gradingSystemService, 'createGradingScaleForCourse').mockReturnValue(of(new HttpResponse<GradingScale>({ body: undefined })));

        comp.save();

        expect(gradingSystemServiceStub).toHaveBeenNthCalledWith(1, comp.courseId, comp.gradingScale);
        expect(gradingSystemServiceStub).toHaveBeenCalledTimes(1);
        expect(comp.existingGradingScale).toBe(false);
    });

    it('should create grading scale correctly for course', () => {
        comp.existingGradingScale = false;
        comp.course = course;
        const createdGradingScaleForCourse = comp.gradingScale;
        createdGradingScaleForCourse.gradeType = GradeType.BONUS;
        const gradingSystemCreateForCourseMock = jest
            .spyOn(gradingSystemService, 'createGradingScaleForCourse')
            .mockReturnValue(of(new HttpResponse<GradingScale>({ body: createdGradingScaleForCourse })));

        comp.save();

        expect(gradingSystemCreateForCourseMock).toHaveBeenNthCalledWith(1, comp.courseId, comp.gradingScale);
        expect(gradingSystemCreateForCourseMock).toHaveBeenCalledTimes(1);
        expect(comp.existingGradingScale).toBe(true);
        expect(comp.gradingScale).toStrictEqual(createdGradingScaleForCourse);
    });

    it('should create grading scale correctly for exam', () => {
        comp.existingGradingScale = false;
        comp.isExam = true;
        comp.exam = exam;
        const createdGradingScaleForExam = comp.gradingScale;
        createdGradingScaleForExam.gradeType = GradeType.BONUS;
        const gradingSystemCreateForExamMock = jest
            .spyOn(gradingSystemService, 'createGradingScaleForExam')
            .mockReturnValue(of(new HttpResponse<GradingScale>({ body: createdGradingScaleForExam })));

        comp.save();

        expect(gradingSystemCreateForExamMock).toHaveBeenNthCalledWith(1, comp.courseId, comp.examId, comp.gradingScale);
        expect(gradingSystemCreateForExamMock).toHaveBeenCalledTimes(1);
        expect(comp.existingGradingScale).toBe(true);
        expect(comp.gradingScale).toStrictEqual(createdGradingScaleForExam);
    });

    it('should update grading scale correctly for course', () => {
        comp.existingGradingScale = true;
        comp.course = course;
        const updateGradingScaleFoCourse = comp.gradingScale;
        updateGradingScaleFoCourse.gradeType = GradeType.BONUS;
        const gradingSystemUpdateForCourseMock = jest
            .spyOn(gradingSystemService, 'updateGradingScaleForCourse')
            .mockReturnValue(of(new HttpResponse<GradingScale>({ body: updateGradingScaleFoCourse })));

        comp.save();

        expect(gradingSystemUpdateForCourseMock).toHaveBeenNthCalledWith(1, comp.courseId, comp.gradingScale);
        expect(gradingSystemUpdateForCourseMock).toHaveBeenCalledTimes(1);
        expect(comp.existingGradingScale).toBe(true);
        expect(comp.gradingScale).toStrictEqual(updateGradingScaleFoCourse);
    });

    it('should update grading scale correctly for exam', () => {
        comp.existingGradingScale = true;
        comp.isExam = true;
        comp.exam = exam;
        const updatedGradingScaleForExam = comp.gradingScale;
        updatedGradingScaleForExam.gradeType = GradeType.BONUS;
        const gradingSystemUpdateForCourseMock = jest
            .spyOn(gradingSystemService, 'updateGradingScaleForExam')
            .mockReturnValue(of(new HttpResponse<GradingScale>({ body: updatedGradingScaleForExam })));

        comp.save();

        expect(gradingSystemUpdateForCourseMock).toHaveBeenNthCalledWith(1, comp.courseId, comp.examId, comp.gradingScale);
        expect(gradingSystemUpdateForCourseMock).toHaveBeenCalledTimes(1);
        expect(comp.existingGradingScale).toBe(true);
        expect(comp.gradingScale).toStrictEqual(updatedGradingScaleForExam);
    });

    it('should handle find response correctly', () => {
        comp.handleFindResponse(comp.gradingScale);

        expect(comp.firstPassingGrade).toStrictEqual('Pass');
        expect(comp.lowerBoundInclusivity).toBe(true);
        expect(comp.existingGradingScale).toBe(true);
    });

    it('should validate valid grading scale correctly', () => {
        expect(comp.validGradeSteps()).toBe(true);
        expect(comp.invalidGradeStepsMessage).toBe(undefined);
    });

    it('should validate invalid grading scale with empty grade steps correctly', () => {
        comp.gradingScale.gradeSteps = [];
        translateStub.mockReturnValue('empty set');

        expect(comp.validGradeSteps()).toBe(false);
        expect(comp.invalidGradeStepsMessage).toStrictEqual('empty set');
        expect(translateStub).toHaveBeenNthCalledWith(1, 'artemisApp.gradingSystem.error.empty');
        expect(translateStub).toHaveBeenCalledTimes(1);
    });

    it('should validate invalid grading scale with negative max points', () => {
        comp.course = course;
        comp.maxPoints = -10;
        translateStub.mockReturnValue('negative max points');

        expect(comp.validGradeSteps()).toBe(false);
        expect(comp.invalidGradeStepsMessage).toStrictEqual('negative max points');
        expect(translateStub).toHaveBeenNthCalledWith(1, 'artemisApp.gradingSystem.error.negativeMaxPoints');
        expect(translateStub).toHaveBeenCalledTimes(1);
        course.maxPoints = 100;
    });

    it('should validate invalid grading scale with empty grade step fields correctly', () => {
        comp.gradingScale.gradeSteps[0].gradeName = '';
        translateStub.mockReturnValue('empty field');

        expect(comp.validGradeSteps()).toBe(false);
        expect(comp.invalidGradeStepsMessage).toStrictEqual('empty field');
        expect(translateStub).toHaveBeenNthCalledWith(1, 'artemisApp.gradingSystem.error.emptyFields');
        expect(translateStub).toHaveBeenCalledTimes(1);
    });

    it('should validate invalid grading scale with empty grade step point fields correctly', () => {
        comp.course = course;
        comp.maxPoints = 100;
        translateStub.mockReturnValue('empty field for points');

        expect(comp.validGradeSteps()).toBe(false);
        expect(comp.invalidGradeStepsMessage).toStrictEqual('empty field for points');
        expect(translateStub).toHaveBeenNthCalledWith(1, 'artemisApp.gradingSystem.error.emptyFields');
        expect(translateStub).toHaveBeenCalledTimes(1);
    });

    it('should validate invalid grading scale with invalid percentages', () => {
        comp.gradingScale.gradeSteps[0].lowerBoundPercentage = -10;
        translateStub.mockReturnValue('invalid percentage');

        expect(comp.validGradeSteps()).toBe(false);
        expect(comp.invalidGradeStepsMessage).toStrictEqual('invalid percentage');
        expect(translateStub).toHaveBeenNthCalledWith(1, 'artemisApp.gradingSystem.error.invalidMinMaxPercentages');
        expect(translateStub).toHaveBeenCalledTimes(1);
    });

    it('should validate invalid grading scale with invalid points', () => {
        comp.maxPoints = 100;
        comp.gradingScale.gradeSteps[0].lowerBoundPoints = 0;
        comp.gradingScale.gradeSteps[0].upperBoundPoints = -120;
        comp.gradingScale.gradeSteps[1].lowerBoundPoints = 40;
        comp.gradingScale.gradeSteps[1].upperBoundPoints = 80;
        comp.gradingScale.gradeSteps[2].lowerBoundPoints = 80;
        comp.gradingScale.gradeSteps[2].upperBoundPoints = 100;
        translateStub.mockReturnValue('invalid points');

        expect(comp.validGradeSteps()).toBe(false);
        expect(comp.invalidGradeStepsMessage).toStrictEqual('invalid points');
        expect(translateStub).toHaveBeenNthCalledWith(1, 'artemisApp.gradingSystem.error.invalidMinMaxPoints');
        expect(translateStub).toHaveBeenCalledTimes(1);
    });

    it('should validate invalid grading scale with set points when all should be undefined', () => {
        comp.gradingScale.gradeSteps[0].upperBoundPoints = 70;

        expect(comp.validGradeSteps()).toBe(false);
    });

    it('should validate invalid grading scale with non-unique grade names', () => {
        comp.gradingScale.gradeType = GradeType.GRADE;
        comp.gradingScale.gradeSteps[1].gradeName = 'Fail';
        translateStub.mockReturnValue('non-unique grade names');

        expect(comp.validGradeSteps()).toBe(false);
        expect(comp.invalidGradeStepsMessage).toStrictEqual('non-unique grade names');
        expect(translateStub).toHaveBeenNthCalledWith(1, 'artemisApp.gradingSystem.error.nonUniqueGradeNames');
        expect(translateStub).toHaveBeenCalledTimes(1);
    });

    it('should validate invalid grading scale with unset first passing grade', () => {
        comp.gradingScale.gradeType = GradeType.GRADE;
        comp.firstPassingGrade = undefined;
        translateStub.mockReturnValue('unset first passing grade');

        expect(comp.validGradeSteps()).toBe(false);
        expect(comp.invalidGradeStepsMessage).toStrictEqual('unset first passing grade');
        expect(translateStub).toHaveBeenNthCalledWith(1, 'artemisApp.gradingSystem.error.unsetFirstPassingGrade');
        expect(translateStub).toHaveBeenCalledTimes(1);
    });

    it('should validate invalid grading scale with invalid bonus points', () => {
        comp.gradingScale.gradeSteps[0].gradeName = '-2';
        comp.gradingScale.gradeType = GradeType.BONUS;
        translateStub.mockReturnValue('invalid bonus points');

        expect(comp.validGradeSteps()).toBe(false);
        expect(comp.invalidGradeStepsMessage).toStrictEqual('invalid bonus points');
        expect(translateStub).toHaveBeenNthCalledWith(1, 'artemisApp.gradingSystem.error.invalidBonusPoints');
        expect(translateStub).toHaveBeenCalledTimes(1);
    });

    it('should validate invalid grading scale without strictly ascending bonus points', () => {
        comp.gradingScale.gradeSteps[0].gradeName = '0';
        comp.gradingScale.gradeSteps[1].gradeName = '2';
        comp.gradingScale.gradeSteps[2].gradeName = '1';
        comp.gradingScale.gradeType = GradeType.BONUS;
        translateStub.mockReturnValue('descending bonus points');

        expect(comp.validGradeSteps()).toBe(false);
        expect(comp.invalidGradeStepsMessage).toStrictEqual('descending bonus points');
        expect(translateStub).toHaveBeenNthCalledWith(1, 'artemisApp.gradingSystem.error.nonStrictlyIncreasingBonusPoints');
        expect(translateStub).toHaveBeenCalledTimes(1);
    });

    it('should validate invalid grading scale with invalid adjacency', () => {
        const gradeStep: GradeStep = {
            gradeName: 'Grade',
            isPassingGrade: false,
            lowerBoundInclusive: true,
            lowerBoundPercentage: 0,
            upperBoundInclusive: false,
            upperBoundPercentage: 30,
        };
        translateStub.mockReturnValue('invalid adjacency');
        jest.spyOn(gradingSystemService, 'sortGradeSteps').mockReturnValue([gradeStep, gradeStep2, gradeStep3]);

        expect(comp.validGradeSteps()).toBe(false);
        expect(comp.invalidGradeStepsMessage).toStrictEqual('invalid adjacency');
        expect(translateStub).toHaveBeenNthCalledWith(1, 'artemisApp.gradingSystem.error.invalidAdjacency');
        expect(translateStub).toHaveBeenCalledTimes(1);
    });

    it('should validate invalid grading scale with invalid first grade step', () => {
        const invalidFirstGradeStep: GradeStep = {
            gradeName: 'Name',
            isPassingGrade: false,
            lowerBoundInclusive: true,
            lowerBoundPercentage: 20,
            upperBoundInclusive: false,
            upperBoundPercentage: 40,
        };
        jest.spyOn(gradingSystemService, 'sortGradeSteps').mockReturnValue([invalidFirstGradeStep, gradeStep2, gradeStep3]);
        comp.gradingScale.gradeSteps[0].lowerBoundPercentage = 10;
        translateStub.mockReturnValue('invalid first grade step');

        expect(comp.validGradeSteps()).toBe(false);
        expect(comp.invalidGradeStepsMessage).toStrictEqual('invalid first grade step');
        expect(translateStub).toHaveBeenCalledWith('artemisApp.gradingSystem.error.invalidFirstAndLastStep');
        expect(translateStub).toHaveBeenCalledTimes(1);
    });

    it('should detect that max points are valid', () => {
        comp.maxPoints = 100;

        expect(comp.maxPointsValid()).toBe(true);
    });

    it('should set points correctly', () => {
        gradeStep1.lowerBoundPoints = undefined;

        comp.setPoints(gradeStep1, true);

        expect(gradeStep1.lowerBoundPoints).toBe(undefined);

        comp.maxPoints = 100;

        comp.setPoints(gradeStep1, true);

        expect(gradeStep1.lowerBoundPoints).toBe(0);

        comp.setPoints(gradeStep1, false);

        expect(gradeStep1.upperBoundPoints).toBe(40);

        gradeStep1.lowerBoundPoints = undefined;
        gradeStep1.upperBoundPoints = undefined;
    });

    it('should set percentages correctly', () => {
        comp.maxPoints = 100;
        gradeStep2.lowerBoundPoints = 40;
        gradeStep2.upperBoundPoints = 80;

        comp.setPercentage(gradeStep2, true);
        comp.setPercentage(gradeStep2, false);

        expect(gradeStep2.lowerBoundPercentage).toBe(40);
        expect(gradeStep2.upperBoundPercentage).toBe(80);

        gradeStep2.lowerBoundPoints = undefined;
        gradeStep2.upperBoundPoints = undefined;
    });

    it('should set all grade step points correctly', () => {
        comp.maxPoints = 100;

        comp.onChangeMaxPoints(100);

        expect(comp.gradingScale.gradeSteps[0].lowerBoundPoints).toBe(0);
        expect(comp.gradingScale.gradeSteps[0].upperBoundPoints).toBe(40);
        expect(comp.gradingScale.gradeSteps[1].lowerBoundPoints).toBe(40);
        expect(comp.gradingScale.gradeSteps[1].upperBoundPoints).toBe(80);
        expect(comp.gradingScale.gradeSteps[2].lowerBoundPoints).toBe(80);
        expect(comp.gradingScale.gradeSteps[2].upperBoundPoints).toBe(100);

        comp.onChangeMaxPoints(-10);

        expect(comp.gradingScale.gradeSteps[0].lowerBoundPoints).toBe(undefined);
        expect(comp.gradingScale.gradeSteps[0].upperBoundPoints).toBe(undefined);
        expect(comp.gradingScale.gradeSteps[1].lowerBoundPoints).toBe(undefined);
        expect(comp.gradingScale.gradeSteps[1].upperBoundPoints).toBe(undefined);
        expect(comp.gradingScale.gradeSteps[2].lowerBoundPoints).toBe(undefined);
        expect(comp.gradingScale.gradeSteps[2].upperBoundPoints).toBe(undefined);
    });

    const csvColumnsGrade = 'gradeName,lowerBoundPercentage,upperBoundPercentage,isPassingGrade';
    const csvColumnsBonus = 'bonusPoints,lowerBoundPercentage,upperBoundPercentage';

    it('should read no grade steps from csv file without data', async () => {
        const event = { target: { files: [csvColumnsGrade] } };
        await comp.onCSVFileSelect(event);

        expect(comp.gradingScale.gradeSteps).toHaveLength(0);
    });

    it('should have validation error for csv without header', async () => {
        // Csv without header
        const invalidCsv = `4.0,10,10,TRUE`;

        const event = { target: { files: [invalidCsv] } };
        await comp.onCSVFileSelect(event);

        expect(comp.gradingScale.gradeSteps).toHaveLength(0);
    });

    it('should import csv with "grade" as grade type correctly', async () => {
        // csv representation of gradeSteps
        const csvRows = [csvColumnsGrade, '1.0,0,40,TRUE', '2.0,40,80,TRUE', '3.0,80,100,FALSE'];
        const event = { target: { files: [csvRows.join('\n')] } };

        const gradeStepsGrade = [
            {
                gradeName: '1.0',
                lowerBoundPercentage: 0,
                lowerBoundPoints: 0,
                upperBoundPercentage: 40,
                upperBoundPoints: 40,
                lowerBoundInclusive: true,
                upperBoundInclusive: false,
                isPassingGrade: true,
            },
            {
                gradeName: '2.0',
                lowerBoundPercentage: 40,
                lowerBoundPoints: 40,
                upperBoundPercentage: 80,
                upperBoundPoints: 80,
                lowerBoundInclusive: true,
                upperBoundInclusive: false,
                isPassingGrade: true,
            },
            {
                gradeName: '3.0',
                lowerBoundPercentage: 80,
                lowerBoundPoints: 80,
                upperBoundPercentage: 100,
                upperBoundPoints: 100,
                lowerBoundInclusive: true,
                upperBoundInclusive: true,
                isPassingGrade: false,
            },
        ];

        await comp.onCSVFileSelect(event);

        expect(comp.gradingScale.gradeSteps).toEqual(gradeStepsGrade);
        expect(comp.gradingScale.gradeType).toBe(GradeType.GRADE);
    });

    it('should import csv with "bonus" as grade type correctly', async () => {
        // csv representation of gradeSteps
        const csvRows = [csvColumnsBonus, '1.0,0,40', '2.0,40,80', '3.0,80,100'];
        const event = { target: { files: [csvRows.join('\n')] } };

        const gradeStepsBonus = [
            {
                gradeName: '1.0',
                lowerBoundPercentage: 0,
                lowerBoundPoints: 0,
                upperBoundPercentage: 40,
                upperBoundPoints: 40,
                lowerBoundInclusive: true,
                upperBoundInclusive: false,
            },
            {
                gradeName: '2.0',
                lowerBoundPercentage: 40,
                lowerBoundPoints: 40,
                upperBoundPercentage: 80,
                upperBoundPoints: 80,
                lowerBoundInclusive: true,
                upperBoundInclusive: false,
            },
            {
                gradeName: '3.0',
                lowerBoundPercentage: 80,
                lowerBoundPoints: 80,
                upperBoundPercentage: 100,
                upperBoundPoints: 100,
                lowerBoundInclusive: true,
                upperBoundInclusive: true,
            },
        ];

        await comp.onCSVFileSelect(event);

        expect(comp.gradingScale.gradeSteps).toEqual(gradeStepsBonus);
        expect(comp.gradingScale.gradeType).toBe(GradeType.BONUS);
    });

    it('should generate csv correctly', () => {
        comp.gradingScale.gradeSteps = gradeSteps;
        const numberOfGradeSteps = gradeSteps.length;
        const exportAsCsvMock = jest.spyOn(comp, 'exportAsCSV');

        comp.exportGradingStepsToCsv();

        expect(exportAsCsvMock).toHaveBeenCalledTimes(1);
        const generatedRows = exportAsCsvMock.mock.calls[0][0];
        expect(generatedRows).toHaveLength(numberOfGradeSteps);

        for (let index = 0; index < numberOfGradeSteps; index++) {
            const gradeStepRow = generatedRows[index];
            validateGradeStepRow(gradeStepRow, gradeSteps[index]);
        }
    });

    it('should apply maxPoints of 100 to all grade steps after csv importing', async () => {
        // csv representation of gradeSteps
        const csvRows = [csvColumnsBonus, '1.0,0,40', '2.0,40,80', '3.0,80,100'];
        const event = { target: { files: [csvRows.join('\n')] } };

        await comp.onCSVFileSelect(event);

        // percentage equal to points due to max points of 100
        for (const gradeStep of comp.gradingScale.gradeSteps) {
            expect(gradeStep.lowerBoundPercentage).toBe(gradeStep.lowerBoundPoints);
            expect(gradeStep.upperBoundPercentage).toBe(gradeStep.upperBoundPoints);
        }
    });

    it('should export as csv', () => {
        comp.exportGradingStepsToCsv();
        expect(ExportToCsv).toHaveBeenCalled();
        expect(generateCsv).toHaveBeenCalled();
    });
});

// validating grade step rows
function validateGradeStepRow(actualGradeStepRow: any, expectedGradeStepRow: GradeStep) {
    expect(actualGradeStepRow.gradeName).toBe(expectedGradeStepRow.gradeName);
    expect(actualGradeStepRow.lowerBoundPercentage).toBe(expectedGradeStepRow.lowerBoundPercentage);
    expect(actualGradeStepRow.upperBoundPercentage).toBe(expectedGradeStepRow.upperBoundPercentage);
}
